// web.js
var express = require("express");
var mongoskin = require('mongoskin');
var bodyParser = require('body-parser');
var logfmt = require("logfmt");
var cors = require('cors');

var app = express();

app.use(bodyParser());
app.use(cors()); //enable all CORS requests

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost:27017/exampleDb';

var db = mongoskin.db(mongoUri, {safe:true})


 app.use(logfmt.requestLogger());


app.param('collectionName', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName);
  return next();
})

app.get('/', function(req, res, next) {
  res.send('<h3>HTTPA Provenance Tracker Gateway</h3><br> Connected Nodes:');
})


app.get('/:collectionName', function(req, res, next) {
  req.collection.find({} ,{limit:10, sort: [['_id',-1]]}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.post('/:collectionName', function(req, res, next) {

  console.log("Received record for: " + req.body._id);
  

  //Need to update each of the document records!
  function updateDocuments(source){
        console.log(source);
        req.collection.findById(source, function(e, result){
            if (e) { return next(e); }
            req.collection.updateById(source, 
                {   $push:{"derivatives" : req.body._id}}, 
                {safe:true, multi:true}, function(e, result){
                if (e) return next(e)
                console.log("source = "+ source);
                console.log("derivative = "+ req.body._id);
                console.log((result===1)?{msg:'added this as a derivative'}:{msg:'error'})
                });
            req.collection.updateById(source, 
                { $push: {"activity" : { "name" : "share", "time": new Date(), "derivative": req.body._id, "details": req.body.meta}}}, 
                {safe:true, multi:true}, function(e, result){
                if (e) return next(e)
                console.log((result===1)?{msg:'added this as a derivative'}:{msg:'error'})
                });
        });

  }

  //Check if the req.body has any source attributes. If so, find them and add this _id
  //to the derivative field
  if (req.body.sources.length > 0){
    for (var i = 0; i<req.body.sources.length; i++){
        updateDocuments(req.body.sources[i]);
    }
  }
  req.collection.insert(req.body, {}, function(e, results){
    if (e) {
        res.send("Error occured. Possibly you attempted adding a duplicate log record.");
        return next(e)
    }
    res.send(results)
  })
})

app.get('/:collectionName/:id', function(req, res, next) {
  req.collection.findById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send(result)
  })
})

app.put('/:collectionName/:id', function(req, res, next) {
    //Having $set here, will replace the record with the new values
  req.collection.updateById(req.params.id, {$push:req.body}, {safe:true, multi:false}, function(e, result){
    if (e) return next(e)
    res.send((result===1)?{msg:'success'}:{msg:'error'})
  })
});

//Any generic activity, in the URL pattern specify what activity you support
app.put('/:collectionName/:activity/:id', function(req, res, next) {
  

  req.collection.updateById(req.params.id, {$push: {"activity": {"name" : req.params.activity, "time" : new Date(), "details" : req.body}}}, {safe:true, multi:false}, function(e, result){
    if (e) return next(e)
    res.send((result===1)?{msg:'success'}:{msg:'error'})
  })
})




//Audit URIS
app.get('/:collectionName/audit/:id', function(req, res, next){
    req.collection.findById(req.params.id, function(e, result){
        if (e) return next(e)

        if (result != null && result.activity != undefined){
            result.activity.sort(
                function (a,b) {
                  if (a != null && b != null){
                      if (a.time > b.time)
                         return -1;
                      if (a.time < b.time)
                        return 1;
                      return 0;  
                  }
                  
                });

            res.send(result.activity);        
        }
        else {
            res.send("Audit log record for resource "+ req.params['id'] +" not found.");
        }

  })
 

});

app.del('/:collectionName/:id', function(req, res, next) {
  req.collection.removeById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send((result===1)?{msg:'success'}:{msg:'error'})
  })
})

var port = Number(process.env.PORT || 5000);

app.listen(port, function() {

    console.log("Listening on " + port);
});
