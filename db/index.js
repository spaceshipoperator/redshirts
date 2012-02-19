var pg = require('pg'); 
var conString = "tcp://captain:kirk@localhost/redshirts";

var client = new pg.Client(conString);
client.connect();

// maybe modularize all of these db queries
var qGetUser = function(d) {
    var q = " "
        + "select id, email_address, role, first_name, last_name "
        + "from users where email_address = '" + d["email_address"] + "' and password = '" + d["password"] + "' ";
    console.log(q);
    return q;
};

var qEmailAddressExists = function(d) {
    // and/or add a unique constraint on the table and handle the error message
    var q = ""
        + "select count(1) c "
        + "from users "
        + "where email_address = '" + d["email_address"] + "' ";
    return q;
};

var qInsertNewUser = function(d) {
    var q = ""
        + "insert into users " 
        + "(role, email_address, password, last_name, first_name) " 
        + "values ('" 
        + "student', '"
	+ d["email_address"] + "', '"
	+ d["password"] + "', '"
	+ d["last_name"] + "', '"
	+ d["first_name"] + "') " 
        + "returning id ";
    return q;
};

var qGetInternships = function(d) {
    // just a smidge of magic here,
    // munging the where clause based on the session user's role
    var q = ""
        + "select id, student_user_id, status, project_title "
        + "from internships where " + d["role"] + "_user_id = " + d["id"] + " "
    return q; 
};

var qInsertNewInternship = function(d) {
    var q = ""
        + "insert into internships "
        + "(student_user_id, status, project_title, project_description, university_student_number, "
        + "number_of_credits, quarter, year, sponsor_company, sponsor_address) "
        + "values ('"
        + d["student_user_id"] + "', '"
        + d["status"] + "', '"
        + d["project_title"] + "', '"
        + d["project_description"] + "', '"
        + d["university_student_number"] + "', '"
        + d["number_of_credits"] + "', '"
        + d["quarter"] + "', '"
        + d["year"] + "', '"
        + d["sponsor_company"] + "', '"
        + d["sponsor_address"] + "') "
        + "returning id ";
    
    return q; 
};

var qGetInternship = function(d) {
    var q = ""
        + "select id, student_user_id, status, project_title, "
        + "student_user_id, status, project_title, project_description, university_student_number, "
        + "number_of_credits, quarter, year, sponsor_company, sponsor_address "
        + "from internships where " + d["role"] + "_user_id = " + d["id"] + " "
        + "and id = " + d["internship_id"] + " " 
    
    return q; 
};

var qUpdateInternship = function(d) {
    var q = ""
        + "update internships set "
        + "project_title = '" + d.internship["project_title"] + "', "
        + "project_description = '" + d.internship["project_description"] + "', "
        + "university_student_number = '" + d.internship["university_student_number"] + "', "
        + "number_of_credits = '" + d.internship["number_of_credits"] + "', "
        + "quarter = '" + d.internship["quarter"] + "', "
        + "year = '" + d.internship["year"] + "', "
        + "sponsor_company = '" + d.internship["sponsor_company"] + "', "
        + "sponsor_address = '" + d.internship["sponsor_address"] + "' "
        + "where id = '" + d.internship["id"] + "' " 
        + "and student_user_id = '" + d["id"] + "' " 
        + "and status in ('pending', 'ready') ";

    return q; 
};

var qUpdateInternshipRequest = function(d) {
    var q = ""
        + "update internships set "
        + "sponsor_email_address = '" + d.request["sponsor_email_address"] + "', "
        + "sponsor_first_name = '" + d.request["sponsor_first_name"] + "', "
        + "sponsor_last_name = '" + d.request["sponsor_last_name"] + "', "
        + "sponsor_requested_on = current_date " 
        + "where id = '" + d.request["internship_id"] + "' " 
        + "and student_user_id = '" + d["id"] + "' ";
    
    return q;
};
// lil helpers
var killSession = function(req, res) {
    if (req.session) {
      req.session.destroy();
    };
    res.redirect("/login");
};

exports.getUser = function(req, res, next){
    if (req.params["userId"] && req.session.user) {
	// a session user exists and theres a userId in the URL
	if (req.params["userId"] == req.session.user.id) {
	    // they match...good to go
	    next();
	} else {
	    // don't match, get outta here
            killSession(req, res);
	}
    } else if (req.body.user && !req.session.user) {
	// we have credentials, but no session user, get it from the db
        client.query(qGetUser(req.body.user), function(err, result) {
	    if (result.rows.length == 1) {
              req.session.user = result.rows[0];
              next();
	    } else {
              req.flash('error', "login failed!");
              res.redirect("/login");
	    }
        });
    } else {
	// something else is going on...something sinister
	if (req.url == "/login") {
	    next();
	} else {
            killSession(req, res);
	};
    };
};

exports.createUser = function(req, res, next){
    // we'll do the password/confirm matching on the client side
    // also, we'll do the password hashing client side
    
    // check to make sure this email addy doesn't already exist
    var d = req.body.newUser;
    
    client.query(qEmailAddressExists(d), function(err, result) {
        if (result.rows[0].c == 0) {
            client.query(qInsertNewUser(d), function(err, result) {
		// insert successful
		req.body.user = d;
                next();
            })
        } else {
            req.flash('error', "that email address already exists!");
            res.redirect("/register");
        };
        
    });
    
};

exports.getInternships = function(req, res, next) {
    var d = req.session.user;
    
    client.query(qGetInternships(d), function(err, result) {
	req.session.internships = result.rows;
	next();
    });
};

exports.createInternship = function(req, res, next) {
    var d = req.body.newIntern;

    client.query(qInsertNewInternship(d), function(err, result) {
	next();
    });
};

exports.getInternship = function(req, res, next) {
    var d = req.session.user;
    d.internship_id = req.params["internId"];
    
    console.log(qGetInternship(d));
    
    client.query(qGetInternship(d), function(err, result) {
	console.log(err);
	req.session.internship = result.rows[0];
	next();
    });
};

exports.updateInternship = function(req, res, next) {
    var d = req.session.user;
    d.internship = req.body.editIntern;
    
    client.query(qUpdateInternship(d), function(err, result) {
	if (err) {
	  console.log(err);
          req.flash('error', "internship *not* saved!");
	} else {
          req.flash('info', "internship saved!");
	}
	next();
    });
};

exports.sendRequest = function(req, res, next) {
    var d = req.session.user;
    d.request = req.body.requestSponsor;

    console.log("quxxx!!?!");
    console.log(JSON.stringify(d.request));
    
    console.log(qUpdateInternshipRequest(d));
    
    client.query(qUpdateInternshipRequest(d), function(err, result) {
	if (err) {
	  console.log(err);
          req.flash('error', "internship request *not* saved!");
	} else {
	  // now we send it...
          req.flash('info', "internship request saved!");
	}
	next();
    });
};
