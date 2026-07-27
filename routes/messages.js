const express=require("express");

const router=express.Router();

const auth=require("../middleware/authMiddleware");

const{

getConversations,

getMessages,

createConversation,

sendMessage

}=require("../controllers/messageController");

router.get("/",auth,getConversations);

router.post("/",auth,createConversation);

router.get("/:id",auth,getMessages);

router.post("/:id",auth,sendMessage);

module.exports=router;