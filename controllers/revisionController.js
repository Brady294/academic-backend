const Revision = require("../models/Revision");

exports.getRevisions = async (
  req,
  res
) => {
  try {
    const revisions =
      await Revision.getAll(req.user.id);

    res.json(revisions);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message:
        "Unable to fetch revisions.",
    });
  }
};

exports.createRevision = async (
  req,
  res
) => {
  try {
    const {
      order_id,
      title,
      instructions,
    } = req.body;

    const revision =
      await Revision.create(
        req.user.id,
        order_id,
        title,
        instructions
      );

    res.json(revision);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message:
        "Unable to submit revision.",
    });
  }
};