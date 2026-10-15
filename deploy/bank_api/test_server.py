#!/usr/bin/env python3
"""Exercise submissions, votes and persistence using an isolated temporary DB."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class BankApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="signplay-bank-test-")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]
        cls.start()

    @classmethod
    def start(cls):
        cls.process = subprocess.Popen(
            [shutil.which("node"), str(Path(__file__).with_name("server.js")),
             "--db", str(Path(cls.temp.name) / "bank.sqlite"), "--port", str(cls.port)],
            env={**os.environ, "BANK_SALT": "isolated-test-only"},
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        for _ in range(100):
            if cls.process.poll() is not None:
                raise RuntimeError("Bank API exited before becoming ready")
            try:
                if cls.request("01")[0] == 200:
                    return
            except URLError:
                time.sleep(0.05)
        cls.stop()
        raise RuntimeError("Bank API did not become ready")

    @classmethod
    def stop(cls):
        cls.process.terminate()
        cls.process.wait(timeout=5)

    @classmethod
    def tearDownClass(cls):
        cls.stop()
        cls.temp.cleanup()

    @classmethod
    def request(cls, route, body=None, voter="test-reader", raw=None):
        payload = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = Request(
            f"http://127.0.0.1:{cls.port}/api/banks/{route}", data=payload,
            headers={"Content-Type": "application/json", "User-Agent": voter},
        )
        try:
            response = urlopen(req, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response)

    def test_seed_text_is_owned_by_server(self):
        status, vote = self.request("01/s0/like", {"text": "不应覆盖示例题目"}, "seed-check")
        self.assertEqual((status, vote["likes"]), (200, 1))
        self.assertEqual(self.request("01")[1]["s0"]["text"], "猫抓老鼠")

    def test_parallel_votes_count_once(self):
        with ThreadPoolExecutor(max_workers=8) as pool:
            votes = list(pool.map(
                lambda _: self.request("02/s1/like", {}, "same-voter"), range(8)
            ))
        self.assertTrue(all(status == 200 and body["likes"] == 1 for status, body in votes))
        self.assertEqual(sum(not body["already"] for _, body in votes), 1)

    def test_submission_and_vote_survive_restart(self):
        status, item = self.request("04", {"text": "  持久化测试  "}, "persistence")
        self.assertEqual(status, 201)
        self.assertEqual(item["text"], "持久化测试")
        self.request("04/" + item["key"] + "/like", {}, "persistence")
        self.stop()
        self.start()
        saved = self.request("04")[1][item["key"]]
        self.assertEqual(saved, {"text": "持久化测试", "likes": 1})

    def test_submission_rate_limit(self):
        statuses = [self.request("04", {"text": f"限流测试 {i}"}, "rate-limit")[0] for i in range(6)]
        self.assertEqual(statuses, [201] * 5 + [429])

    def test_validation(self):
        self.assertEqual(self.request("99")[0], 404)
        self.assertEqual(self.request("01", {"text": " "})[0], 400)
        self.assertEqual(self.request("01", {"text": "字" * 41})[0], 400)
        self.assertEqual(self.request("01", raw=b"null")[0], 400)
        self.assertEqual(self.request("01/s999/like", {})[0], 404)
        self.assertEqual(self.request("01/s00/like", {})[0], 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
