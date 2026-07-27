const path = require("path");

const Download = require("../models/Download");

exports.getDownloads = async (req, res) => {
  try {
    const downloads =
      await Download.getDownloads(req.user.id);

    res.json(downloads);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to fetch downloads.",
    });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const file =
      await Download.getDownload(
        req.params.id,
        req.user.id
      );

    if (!file) {
      return res.status(404).json({
        message: "File not found.",
      });
    }

    res.download(
      path.resolve(file.file_path),
      file.file_name
    );
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Download failed.",
    });
  }
};