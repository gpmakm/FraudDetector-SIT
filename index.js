const express=require('express');
const app=express();
const path=require('path');
const fs=require('fs');

const PORT=process.env.PORT||3000;
const filePath = path.join(__dirname, 'public', 'dataset.json');

function appendData() {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let data = JSON.parse(content);

    // choose random user
    let userKey = Math.floor(Math.random() * data.length);
    let user = data[userKey];

    // choose credits / debits
    let arraykey = Math.random() > 0.5 ? "credits" : "debits";

    // check inside the user
    if (!Array.isArray(user[arraykey])) {
      console.error(`❌ '${arraykey}' is not an array for user ${userKey}.`);
      return;
    }

    // create new data
    let newData = {
      amount: Math.floor(Math.random() * 1000000),
      date: new Date().toISOString().slice(0,10)
    };

    // push data
    user[arraykey].push(newData);

    // save file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Added ${JSON.stringify(newData)} to '${arraykey}' of user ${userKey}`);
  }
  catch(err) {
    console.error("❌ Error:", err);
  }
}
app.use(express.static(path.join(__dirname,'public')));
try{
    setInterval(appendData,5000)
}
catch(err){
    console.error(`Error generated ${err}`)
}

app.listen(PORT,(err)=>{
    if (!err) {
        console.log("Server started");
        
    } 
    else{
        console.error(`Error occured ${err}`)
    }
})