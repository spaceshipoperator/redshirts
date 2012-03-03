
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
  //app.use(express.session({ secret: "your secret here" }));
  app.use(express.session({cookie: { path: '/', httpOnly: true, maxAge: null}, secret:'eeuqram'}));
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
app.post("/register", db.createUser, db.getUser, db.getInternships, function(req, res) {
    redirectInternList(req, res);
});

app.get("/login", routes.login);
app.post("/login", db.getUser, function(req, res) {
    redirectInternList(req, res);
});

app.get("/logout", routes.logout);

app.get("/:userId/intern/list", db.getUser, db.getInternships, routes.internList);

// TODO: only students can create internships...if you're not one...go back to list
app.get("/:userId/intern/new", db.getUser, routes.internNew);
app.post("/:userId/intern/new", db.getUser, db.createInternship, function(req, res) {
    redirectInternList(req, res);
});

app.get("/:userId/intern/:internId", db.getUser, db.getInternship, routes.internEdit);
app.post("/:userId/intern/:internId", db.getUser, db.updateInternship, db.getInternship, function(req, res) {
    redirectInternEdit(req, res);
});
app.get("/", routes.Index);

app.get("/:userId/intern/:internId/request", db.getUser, db.getInternship, routes.requestParticipant);
app.post("/:userId/intern/:internId/request", db.getUser, db.getParticipant, db.getInternship, db.requestParticipant, db.sendRequest, db.getInternship, function(req, res) {
    redirectInternEdit(req, res);
});

app.get("/:userId/intern/:internId/remove/:participantId", db.getUser, db.getInternship, db.removeParticipant, db.getInternship, function(req, res) {
    redirectInternEdit(req, res);
});

app.get("/accept/:requestHash", db.acceptParticipant, routes.thanksParticipant);

app.get("/:userId/intern/:internId/activity/new", db.getUser, db.getInternship, routes.activityNew);
app.post("/:userId/intern/:internId/activity/new", db.getUser, db.getInternship, db.createActivity, db.getInternship, function(req, res) {
    redirectInternEdit(req, res);
});

app.get("/:userId/intern/:internId/activity/:activityId", db.getUser, db.getInternship, db.getActivity, routes.activityEdit);
app.post("/:userId/intern/:internId/activity/:activityId", db.getUser, db.getInternship, db.editActivity, db.getInternship, function(req, res) {
    redirectInternEdit(req, res);
});

app.get("/:userId/intern/:internId/activity/:activityId/comment", db.getUser, db.getInternship, db.getActivity, routes.activityComment);
app.post("/:userId/intern/:internId/activity/:activityId/comment", db.getUser, db.getInternship, db.getActivity, db.createComment, function(req, res) {
    res.redirect("/" + req.session.user.id + "/intern/" + req.params["internId"] + "/activity/" + req.params["activityId"]);
});

app.listen(3003);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
