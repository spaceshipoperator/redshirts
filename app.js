
/**
 * Module dependencies.
 */

var express = require("express")
  , db = require("./db")
  , routes = require("./routes");

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set("views", __dirname + "/views");
  app.set("view engine", "jade");
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "your secret here" }));
  app.use(require("stylus").middleware({ src: __dirname + "/public" }));
  app.use(app.router);
  app.use(express.static(__dirname + "/public"));
});

app.configure("development", function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure("production", function(){
  app.use(express.errorHandler());
});

// Route Helpers
app.dynamicHelpers({
  user: function(req, res){
    return req.session.user;
  }
});

var redirectInternList = function(req, res) {
    res.redirect("/" + req.session.user.id + "/intern/list");
};

var redirectInternEdit = function(req, res) {
    res.redirect("/" + req.session.user.id + "/intern/" + req.params["internId"]);
};

// Routes

app.get("/register", routes.register);
app.post("/register", db.createUser, db.getUser, function(req, res) {
    redirectInternList(req, res);
});

app.get("/login", routes.login);
app.post("/login", db.getUser, db.getInternships, function(req, res) {
    redirectInternList(req, res);
});

app.get("/:userId/intern/list", db.getUser, db.getInternships, routes.internList);

// TODO: only students can create internships...if you're not one...go back to list
app.get("/:userId/intern/new", db.getUser, routes.internNew);
app.post("/:userId/intern/new", db.getUser, db.createInternship, function(req, res) {
    redirectInternList(req, res);
});

app.get("/:userId/intern/:internId", db.getUser, db.getInternship, routes.internEdit);
app.post("/:userId/intern/:internId", db.getUser, db.updateInternship, function(req, res) {
    redirectInternEdit(req, res);
});

// TODO: maybe wanna go ahead and update the internship while we're at it?
app.post("/:userId/intern/:internId/request/:requestType", db.getUser, db.getInternship, db.sendRequest, function(req, res) {
    // /23/intern/6/request/sponsor
    console.log("fooo!!!");
    console.log(JSON.stringify(req.body.requestSponsor));
    redirectInternEdit(req, res);
});

app.get("/:userId/intern/:internId/activity/new", routes.InternActivityNew)
app.post("/:userId/intern/:internId/activity/new", function(req, res) {
    redirectInternEdit(req, res);
});

app.post("/:userId/intern/:internId/activity/:activityID", routes.InternActivityEdit)

app.post("/:userId/intern/:internId/request", routes.InternRequest)

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
