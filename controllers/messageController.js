const Message=require("../models/Message");

exports.getConversations=async(req,res)=>{

try{

const conversations=
await Message.getConversations(req.user.id);

res.json(conversations);

}catch(err){

console.error(err);

res.status(500).json({

message:"Unable to load conversations."

});

}

};

exports.getMessages=async(req,res)=>{

try{

const messages=

await Message.getMessages(

req.params.id,

req.user.id

);

res.json(messages);

}catch(err){

console.error(err);

res.status(500).json({

message:"Unable to load messages."

});

}

};

exports.createConversation=async(req,res)=>{

try{

const conversation=

await Message.createConversation(

req.user.id,

req.body.subject

);

res.json(conversation);

}catch(err){

console.error(err);

res.status(500).json({

message:"Unable to create conversation."

});

}

};

exports.sendMessage=async(req,res)=>{

try{

const message=

await Message.sendMessage(

req.params.id,

"student",

req.body.message,

req.body.attachment||null

);

res.json(message);

}catch(err){

console.error(err);

res.status(500).json({

message:"Unable to send message."

});

}

};