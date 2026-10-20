from unittest.mock import patch

import frappe
from frappe.tests import UnitTestCase

from hrms.www.hrms import get_context_for_dev


class TestPWABoot(UnitTestCase):
	def test_development_boot_includes_the_session_token(self):
		boot = frappe._dict(site_name="hrms.localhost", socketio_port=9001)
		with (
			patch.dict(frappe.conf, {"developer_mode": 1}),
			patch("hrms.www.hrms.get_boot", return_value=boot),
			patch("frappe.sessions.get_csrf_token", return_value="session-token"),
		):
			self.assertEqual(
				get_context_for_dev(),
				{"site_name": "hrms.localhost", "socketio_port": 9001, "csrf_token": "session-token"},
			)

	def test_development_boot_remains_disabled_on_production_sites(self):
		with (
			patch.dict(frappe.conf, {"developer_mode": 0}),
			patch("hrms.www.hrms.get_boot") as get_boot,
			patch("frappe.sessions.get_csrf_token") as get_csrf_token,
		):
			self.assertRaises(frappe.ValidationError, get_context_for_dev)
			get_boot.assert_not_called()
			get_csrf_token.assert_not_called()
