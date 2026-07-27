const bcrypt = require("bcryptjs");

const Settings = require("../models/Settings");

exports.getSettings = async (req, res) => {

    try {

        const settings =
            await Settings.getSettings(
                req.user.id
            );

        res.json(settings);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Failed to fetch settings."
        });

    }

};

exports.changePassword = async (
    req,
    res
) => {

    try {

        const {

            password

        } = req.body;

        const hashed =
            await bcrypt.hash(password, 10);

        await Settings.changePassword(

            req.user.id,

            hashed

        );

        res.json({

            success: true

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Unable to update password."
        });

    }

};