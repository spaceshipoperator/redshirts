var crypto = require("crypto");
var nodemailer = require("nodemailer");
var pg = require('pg'); 
var conString = "tcp://captain:kirk@localhost/redshirts";


var client = new pg.Client(conString);
client.connect();

// maybe modularize all of these db queries
var qGetUser = function(d) {
    var q = " "
        + "select id, email_address, role, first_name, last_name "
        + "from users where email_address = '" + d["email_address"] + "' and password = '" + d["password"] + "' ";
    return q;
};

// perhaps refactor for reuse...
var qEmailAddressExists = function(d) {
    // and/or add a unique constraint on the table and handle the error message
    var q = ""
        + "select id, email_address, role, first_name, last_name "
        + "from users "
        + "where email_address = '" + d["email_address"] + "' ";
    return q;
};

var qInsertNewUser = function(d) {
    var q = ""
        + "insert into users " 
        + "(role, email_address, password, last_name, first_name) " 
        + "values ('" 
        + d["role"] + "', '"
        + d["email_address"] + "', '"
        + d["password"] + "', '"
        + d["last_name"] + "', '"
        + d["first_name"] + "') " 
        + "returning id ";
    return q;
};

var qGetStudentInternships = function(d) {
    var q = ""
        + "select id, student_user_id, status, project_title "
        + "from internships where student_user_id = " + d["id"] + " "
    return q; 
};

var qGetAllActiveInternships = function(d) {
    var q = ""
        + "select id, student_user_id, status, project_title "
        + "from internships where status in ('ready', 'approved', 'in progress', 'milestone due') "
    return q; 
};

var qGetParticipantInternships = function(d) {
    var q = ""
        + "select i.id, i.student_user_id, i.status, i.project_title "
        + "from internships i join participants p "
        + "on i.id = p.internship_id "
        + "where p.accepted_on is not null " 
        + "and p.user_id = '" + d["id"] + "' ";
    
    return q; 
};

var qInsertInternship = function(d) {
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
        + "from internships where id = " + d["internship_id"] + " " 
    
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

var qParticipantExists = function(d) {
    var q = ""
        + "select id, internship_id, user_id "
        + "from participants "
        + "where internship_id = " + d["internship_id"] + " " 
        + "and user_id = " + d["id"] + " "; 

    return q;
};

var qInsertParticipant = function(d) {
    var q = ""
        + "insert into participants "
        + "(internship_id, user_id, request_hash, requested_on) "
        + "values ('"
        + d["internship_id"] + "', '"
        + d["id"] + "', '"
        + d["request_hash"] + "', "
        + "to_date('" + d["requested_on"] + "', 'yyyy-mm-dd')) "
        + "returning id ";

    return q;
};

var qGetParticipants = function(d) {
    var q = ""
        + " select u.role, u.first_name || ' ' || u.last_name as full_name, u.email_address,  " 
        + " to_char(p.requested_on, 'yyyy-mm-dd') as requested_on, " 
        + " to_char(p.accepted_on, 'yyyy-mm-dd') as accepted_on,  p.id "
        + " from users u join participants p on u.id = p.user_id " 
        + " where p.internship_id = " + d["internship_id"] + " "
        + " order by p.requested_on " 
    
    return q;
};

var qRemoveParticipant = function(d)  {
    var q = ""
        + "delete from participants "
        + "where id = " + d["participant_id"] + " "

    return q;
};

var qUpdateParticipantAcceptedOn = function(d) {
    var q = ""
        + "update participants "
        + "set accepted_on = to_date('" 
        + d["accepted_on"] + "', 'yyyy-mm-dd') "
        + "where request_hash = '"
        + d["request_hash"] +"' "
        + "returning internship_id " 

    return q;
};

var qUpdateInternshipStatus = function(d) {
    var q = ""
        + "update internships " 
        + "set status = '" + d["status"] + "' "
        + "where id = '" + d["id"] + "' ";
    
    return q;
};

// lil helpers

// from http://stackoverflow.com/questions/2280104/convert-javascript-to-date-object-to-mysql-date-format-yyyy-mm-dd
// all this to get a sanely formatted date string...yeesh
(function() {
    Date.prototype.toYMD = Date_toYMD;
    function Date_toYMD() {
        var year, month, day;
        year = String(this.getFullYear());
        month = String(this.getMonth() + 1);
        if (month.length == 1) {
            month = "0" + month;
        }
        day = String(this.getDate());
        if (day.length == 1) {
            day = "0" + day;
        }
        return year + "-" + month + "-" + day;
    }
})();

var killSession = function(req, res) {
    if (req.session) {
      req.session.destroy();
    };
    res.redirect("/login");
};

var checkInternshipStatus = function(d) {
    // d is my internship
    // s is my status
    var s = "pending";
    
    // aa is advisor accepted
    var aa = false;
    
    // sa is sponsor accepted
    var sa = false;

    // are we ready
    if (d.participants) {
        for (var i=0; i<d.participants.length; i++) {
            var p = d.participants[i];
            
            // check to see if we've got an advisor
            if (p.role == "advisor" && p.accepted_on) {
                aa = true;
            } else {
                // check to see if we've got an advisor
                if (p.role == "sponsor" && p.accepted_on) {
                    sa = true;
                };
            };

            if (aa && sa) {
                s = "ready";
                break;
            };
        };
    } else {
        // without accepted sponsor/advisor, we're pending, that's that
    };

    // are we approved
    // are we in progress
    // do we have a milestone due
    // are we completed
    // are we cancelled
    
    return s;
    
};

var checkSetInternshipStatus = function(d) {
    // d has an internship_id
    // get the internship from the database
    client.query(qGetInternship(d), function(err, result) {
        var internship = result.rows[0];
        
        client.query(qGetParticipants(d), function(err, result) {
            internship.participants = result.rows;

            var cstatus = checkInternshipStatus(internship);
            
            if (internship.status != cstatus) {
                internship.status = cstatus;
                client.query(qUpdateInternshipStatus(internship), function(err, result) {
                    console.log("internship status updated in db...but the app moves on, async like");
                });
            };
        });
    });
};

// methods exposed to app
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
        if (result.rows.length == 0) {
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
    var q = "";
    
    if (d.role == "student") {
        // if student, get internships I own
        q = qGetStudentInternships(d);
    } else if (d.role == "admin") {
        // if admin, get all active internships
        q = qGetAllActiveInternships(d);
    } else if (d.role == "sponsor" || d.role == "advisor") {
        // if advisor/sponsor, get internships I've accepted
        q = qGetParticipantInternships(d);
    };

    console.log(q);
    client.query(q, function(err, result) {
        //console.log(err);
        req.session.internships = result.rows;
        next();
    });
    
};

exports.createInternship = function(req, res, next) {
    var d = req.body.newIntern;

    client.query(qInsertInternship(d), function(err, result) {
        next();
    });
};

exports.getInternship = function(req, res, next) {
        
    var d = req.session.user;
    
    d.internship_id = req.params["internId"];

    client.query(qGetInternship(d), function(err, result) {
        req.session.internship = result.rows[0];

        client.query(qGetParticipants(d), function(err, result) {
            req.session.internship.participants = result.rows;

            next();
        });
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

exports.getParticipant = function(req, res, next) {
    var d = req.body.requestParticipant;
    client.query(qEmailAddressExists(d), function(err, result) {
        if (result.rows.length == 0) {
            // requested participant is not yet a user...
            client.query(qInsertNewUser(d), function(err, result) {
                // insert successful
                req.body.requestParticipant.id = result.rows[0].id;
                // now update the internship with the returned id
                next();
            });
        } else {
            // requested participant is already user...
            if (result.rows[0].role == d.role) {
                // user has teh role we want, great
                req.body.requestParticipant.id = result.rows[0].id;
                // now update the internship with the returned id
                next();
            } else {
                req.flash("error", "the person you requested already has a different role, contact the administrator!");
                res.redirect(req.url);
            };
        };
    });
};

exports.requestParticipant = function(req, res, next) {
    var d = req.body.requestParticipant;
    
    d.requested_on = new Date().toYMD();
    
    var shasum = crypto.createHash("sha1");
    
    shasum.update(d["internship_id"] + d["email_address"] + d["requested_on"]);
    d.request_hash = shasum.digest("hex");
    
    client.query(qParticipantExists(d), function(err, result) {
        if (result.rows.length == 0) {
            client.query(qInsertParticipant(d), function(err, result) {
                console.log(err);
                req.flash("info", "participant requested!");
                // participant requested
                next();
            });
        } else {
            req.flash("error", "the person as already been requested to participate!");
            res.redirect(req.url);
        }
        
    });
};

exports.removeParticipant = function(req, res, next) {
    var d = req.session.internship;
    d.participant_id = req.params["participantId"];
    // check/set status needs a field called internship_id...sloppy, sure...meh
    d.internship_id = d.id;

    client.query(qRemoveParticipant(d), function(err, result) {
        req.flash("info", "participant removed!");
        checkSetInternshipStatus(d);
        next();
    });
};

exports.sendRequest = function(req, res, next) {
    var d = req.body.requestParticipant;
    var u = req.session.user;
    var r = process.env.EMAIL_RECEIVER || d["email_address"];
    
    var message = "Greetings! "
        + "<p><p> "
        + "If you would kindly like to participate in "
        + u["first_name"] + " " + u["last_name"] + "'s " 
        + "internship, please, enthusiastically click the following hyperlink! "
        + "<p><p> "
        + "http://" + d["host"] + "/accept/" + d["request_hash"] + " "
        + "<p><p>" ; 
    
    var transport = nodemailer.createTransport("SMTP",{
        service: process.env.EMAIL_SENDER_SERVICE,
        auth: {
            user: process.env.EMAIL_SENDER_USER,
            pass: process.env.EMAIL_SENDER_PASSWORD
        }
    });
    
    var mailOptions = {
        transport: transport, // transport method to use
        from: process.env.EMAIL_SENDER_USER, // sender address
        to: r, // list of receivers
        subject: "please contribute to a successful internship!", // Subject line
        text: message, // plaintext body
        html: message + "<p><p>Thank you! " // html body
    };

    nodemailer.sendMail(mailOptions, function(error){
        if(error){
            console.log(error);
            req.flash("error", "participant request saved to database, but failed to send email!");
        } else {
            console.log("email sent!");
        };
        next();
        
        transport.close(); // lets shut down the connection pool
    });
};

exports.acceptParticipant = function(req, res, next) {
    var d = {};

    d.request_hash = req.params["requestHash"];
    d.accepted_on = new Date().toYMD();
    
    client.query(qUpdateParticipantAcceptedOn(d), function(err, result) {
        if (err) {
            req.flash("error", "something went horribly wrong, but don't let that stop you from having a nice day!");
            next();
        } else {
            // make sure we got an internship id, right
            if (result.rows[0]) {
                d.internship_id = result.rows[0].internship_id;

                checkSetInternshipStatus(d);
                req.flash("info", "thanks for helping out with my internship!");
            } else {
                req.flash("info", "whoops...couldn't find the internship, thanks anyway!");
            };
            
            next();
        }
    });
    
};