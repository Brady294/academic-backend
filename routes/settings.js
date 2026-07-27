const express = require("express");

const router = express.Router();

const auth =
require("../middleware/authMiddleware");

const {

    getSettings,

    changePassword

} = require("../controllers/settingController");

router.get(

    "/",

    auth,

    getSettings

);

router.put(

    "/password",

    auth,

    changePassword

);

module.exports = router;