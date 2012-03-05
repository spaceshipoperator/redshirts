exports.index = function(req, res){
    res.render("index", {
        title: "UW Tacoma Internships!" });
};

exports.faq = function(req, res){
    res.render("faq", {
        title: "FAQ!"});
};

exports.gettingStarted = function(req, res){
    res.render("gettingStarted", {
        title: "Getting Started!"});
};
exports.register = function(req, res){
    res.render("register", {
        title: "Register!",
        message: req.flash("error") });
};

exports.login = function(req, res){
    res.render("login", {
        title: "Login!",
        message: req.flash("error"),
        headers: JSON.stringify(req.headers) });
};

exports.logout = function(req,res){
    req.session.regenerate(function(err) {
        res.render("logout", {
            title: "Logout!" });
    });
};

exports.internList = function(req, res){
    res.render("internList", {
        title: "Internships!",
        internships: req.session.internships,
        error: req.flash("error"),
        headers: JSON.stringify(req.headers) });
};

exports.internNew = function(req, res){
    res.render("internNew", {
        title: "New Internship!",
        message: req.flash("error"),
        headers: JSON.stringify(req.headers) });
};

exports.internEdit = function(req, res){
    res.render("internEdit", {
        title: "Edit Internship!",
        internship: req.session.internship,
        info: req.flash("info"),
        error: req.flash("error"),
        headers: JSON.stringify(req.headers) })
};

exports.requestParticipant = function(req, res){
    res.render("requestParticipant", {
        title: "Request Participant!",
        internship: req.session.internship,
        error: req.flash("error"),
        host: req.headers.host });
};

exports.thanksParticipant = function(req, res){
    res.render("thanksParticipant", {
        title: "Thanks Participant!",
        error: req.flash("error"),
        info: req.flash("info") });
};

exports.activityNew = function(req, res){
    res.render("activityNew", {
        title: "New Activity!",
        internship: req.session.internship,
        error: req.flash("error"),
        info: req.flash("info") });
};

exports.activityEdit = function(req, res){
    res.render("activityEdit", {
        title: "Edit Activity!",
        internship: req.session.internship,
        activity: req.session.activity,
        error: req.flash("error"),
        info: req.flash("info") });
};

exports.activityComment = function(req, res){
    res.render("activityComment", {
        title: "New Comment!",
        activity: req.session.activity,
        error: req.flash("error"),
        info: req.flash("info") });
};

exports.recoverPassword = function(req, res){
    res.render("recoverPassword", {
        title: "Recover Password!",
        host: req.headers.host });
};

exports.passwordRecoverySent = function(req, res){
    res.render("passwordRecoverySent", {
        title: "Password Recovery Sent!" });
};

exports.emailNotFound = function(req, res){
    res.render("emailNotFound", {
        title: "Email Address Not Found!" });
};

exports.resetPassword = function(req, res){
    res.render("resetPassword", {
        title: "Reset Your Password!",
        email_address: req.email_address });
};

exports.resetSuccessful = function(req, res){
    res.render("resetSuccessful", {
        title: "Password Reset Successful!" });
};

exports.resetFailed = function(req, res){
    res.render("resetFailed", {
        title: "Password Reset Failed!" });
};
