// routes/teamMembers.js
const express = require("express");
const router = express.Router();
const teamMembersController = require("../controllers/teamMembers");

router.get("/searchTeamMembers", teamMembersController.searchTeamMembers);

module.exports = router;
