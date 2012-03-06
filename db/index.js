var crypto = require("crypto");
var nodemailer = require("nodemailer");
var pg = require('pg'); 
var conString = "tcp://captain:kirk@localhost/redshirts";

var client = new pg.Client(conString);
client.connect();

// maybe modularize all of these db queries
var qGetUser = ""
    + "select id, email_address, role, first_name, last_name "
    + "from users where email_address = $1 and password = $2 ";

var qEmailAddressExists = ""
    + "select id, email_address, role, first_name, last_name "
    + "from users "
    + "where email_address = $1 ";

var qInsertNewUser = ""
    + "insert into users " 
    + "(email_address, role, password, last_name, first_name) " 
    + "values ($1, $2, $3, $4, $5) " 
    + "returning id ";

var qGetStudentInternships = ""
    + "select id, student_user_id, status, project_title "
    + "from internships where student_user_id = $1 "
    + "and status not in ('cancelled') ";

var qGetAllActiveInternships = ""
    + "select i.id, i.student_user_id, i.status, i.project_title, "
    + "u.first_name || ' ' || u.last_name student_name "
    + "from internships i join users u "
    + "on i.student_user_id = u.id "
    + "where i.status in ('ready', 'approved', 'in progress', 'activity due') "

var qGetParticipantInternships = ""
    + "select i.id, i.student_user_id, i.status, i.project_title, "
    + "u.first_name || ' ' || u.last_name student_name "
    + "from internships i join users u "
    + "on i.student_user_id = u.id "
    + "join participants p "
    + "on i.id = p.internship_id "
    + "where p.accepted_on is not null "
    + "and p.user_id = $1 "
    + "and i.status not in ('cancelled') ";

var qInsertInternship = ""
    + "insert into internships "
    + "(student_user_id, status, project_title, project_description, university_student_number, "
    + "number_of_credits, quarter, year, sponsor_company, sponsor_address) "
    + "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) "
    + "returning id ";

var qGetInternship = ""
    + "select i.id, i.student_user_id, i.status, u.first_name, u.last_name, i.project_title, "
    + "i.student_user_id, i.status, i.project_title, i.project_description, i.university_student_number, "
    + "i.number_of_credits, i.quarter, i.year, i.sponsor_company, i.sponsor_address, "
    + "to_char(i.admin_approved_on, 'yyyy-mm-dd') admin_approved_on, "
    + "to_char(i.employment_begin_on, 'yyyy-mm-dd') employment_begin_on, "
    + "to_char(i.colloquium_presentation_on, 'yyyy-mm-dd') colloquium_presentation_on, "
    + "to_char(i.completed_on, 'yyyy-mm-dd') completed_on, "
    + "to_char(i.cancelled_on, 'yyyy-mm-dd') cancelled_on "
    + "from internships i join users u "
    + "on i.student_user_id = u.id "
    + "where i.id = $1 "

var qUpdateInternship = ""
    + "update internships set "
    + "project_title = $1, "
    + "project_description = $2, "
    + "university_student_number = $3, "
    + "number_of_credits = $4, "
    + "quarter = $5, "
    + "year = $6, "
    + "sponsor_company = $7, "
    + "sponsor_address = $8, "
    + "employment_begin_on = to_date($9, 'yyyy-mm-dd'), "
    + "colloquium_presentation_on = to_date($10, 'yyyy-mm-dd') "
    + "where id = $11 "
    + "and student_user_id = $12 "
    + "and status not in ('cancelled', 'completed') ";

var qUpdateInternshipCancelled = ""
    + "update internships set "
    + "cancelled_on = $2 "
    + "where id = $1 "
    + "returning id ";

var qUpdateInternshipReopened = ""
    + "update internships set "
    + "cancelled_on = null "
    + "where id = $1 "
    + "returning id ";

var qUpdateInternshipApproved = ""
    + "update internships set "
    + "admin_approved_on = $2 "
    + "where id = $1 "
    + "returning id ";

var qParticipantExists = ""
    + "select id, internship_id, user_id "
    + "from participants "
    + "where internship_id = $1 " 
    + "and user_id = $2 "; 

var qInsertParticipant = ""
    + "insert into participants "
    + "(internship_id, user_id, request_hash, requested_on) "
    + "values ($1, $2, $3, to_date($4, 'yyyy-mm-dd')) "
    + "returning id ";

var qGetParticipants = ""
    + "select p.id, p.user_id, u.role, "
    + "u.first_name || ' ' || u.last_name as full_name, u.email_address,  " 
    + "to_char(p.requested_on, 'yyyy-mm-dd') as requested_on, " 
    + "to_char(p.accepted_on, 'yyyy-mm-dd') as accepted_on "
    + "from users u join participants p on u.id = p.user_id " 
    + "where p.internship_id = $1 " 
    + "order by p.requested_on ";

var qClearApproved = ""
    + "update internships "
    + "set admin_approved_on = null "
    + "where id = $1 "

var qRemoveParticipant = ""
    + "delete from participants "
    + "where id = $1 ";

var qUpdateParticipantAcceptedOn = ""
    + "update participants "
    + "set accepted_on = to_date($1, 'yyyy-mm-dd') "
    + "where request_hash = $2 "
    + "returning internship_id "; 

var qUpdateInternshipStatus = ""
    + "update internships " 
    + "set status = $2 "
    + "where id = $1 ";

var qInsertActivity = ""
    + "insert into activities "
    + "(internship_id, description, scheduled_on) "
    + "values ($1, $2, to_date($3, 'yyyy-mm-dd')) "
    + "returning id ";

var qGetActivities = ""
    + "with latest_comment as ( " 
    + "select " 
    + "activity_id, " 
    + "max(id) id " 
    + "from comments " 
    + "group by activity_id ) " 
    + "select a.id, " 
    + "substring(a.description, 1, 27) || '...' description, " 
    + "to_char(a.scheduled_on, 'yyyy-mm-dd') scheduled_on, " 
    + "to_char(a.completed_on, 'yyyy-mm-dd') completed_on, " 
    + "u.first_name || ' ' || u.last_name latest_contributor, " 
    + "to_char(c.posted_on, 'yyyy-mm-dd') latest_edit " 
    + "from activities a " 
    + "left join latest_comment lc " 
    + "on a.id = lc.activity_id " 
    + "left join comments c " 
    + "on lc.id = c.id " 
    + "left join users u " 
    + "on c.user_id = u.id " 
    + "where a.internship_id = $1 " 
    + "order by a.scheduled_on desc ";

// join to get most latest edit and contributor
// rather than complicated sql here, create a view to support that
var qGetActivity = ""
    + "select id, description, " 
    + "to_char(scheduled_on, 'yyyy-mm-dd') scheduled_on, "
    + "to_char(completed_on, 'yyyy-mm-dd') completed_on "
    + "from activities where id = $1 ";

var qGetComments = " "
    + "select u.first_name || ' ' || u.last_name contributor, "
    + "to_char(c.posted_on, 'yyyy-mm-dd') posted_on, "
    + "c.comment from comments c "
    + "join users u on c.user_id = u.id "
    + "where c.activity_id = $1 ";

var qUpdateActivitySave = ""
    + "update activities set description = $1, "
    + "scheduled_on = to_date($2, 'yyyy-mm-dd'), "
    + "completed_on = to_date($3, 'yyyy-mm-dd') "
    + "where id = $4 ";

var qDeleteComments = ""
    + "delete from comments where activity_id = $1 ";

var qUpdateActivityDelete = ""
    + "delete from activities where id = $1 ";

var qInsertComment = ""
    + "insert into comments " 
    + "(activity_id, user_id, posted_on, comment) " 
    + "values ($1, $2, to_date($3, 'yyyy-mm-dd'), $4) " 
    + "returning id ";

var qGetAdminIds = ""
    + "select id from users where role = 'admin' ";

var qFindUser = ""
    + "select to_char(current_timestamp, 'yyyymmddhh24miss') current_datetime "
    + "from users where email_address = $1 "; 

var qInsertPasswordRecovery = ""
    + "insert into password_recovery "
    + "(email_address, recovery_hash) " 
    + "values ($1, $2) "
    + "returning true ";

var qGetPasswordRecovery = ""
    + "select email_address "
    + "from password_recovery "
    + "where recovery_hash = $1 ";

var qUpdateUserPassword = ""
    + "update users "
    + "set password = $1 "
    + "where email_address = $2 "
    + "returning true ";

var qGetUsersDueReminderOfActivity = ""
    + "with reminders_due as ( "
    + "select distinct "
    + "u.id user_id, u.role, u.email_address, u.first_name, u.last_name, "
    + "u.first_name || ' ' || u.last_name student_name, "
    + "i.id internship_id, i.project_title, "
    + "min(a.scheduled_on) activity_scheduled_on "
    + "from activities a "
    + "join internships i "
    + "on a.internship_id = i.id "
    + "join users u "
    + "on i.student_user_id = u.id "
    + "where i.status in ('ready', 'approved', 'in progress', 'activity due') "
    + "and a.completed_on is null "
    + "and a.scheduled_on < (current_date + 2) "
    + "group by "
    + "u.id, u.role, u.email_address, u.first_name, u.last_name, "
    + "u.first_name || ' ' || u.last_name, "
    + "i.id, i.project_title "
    + "union "
    + "select distinct "
    + "f.id user_id, f.role, f.email_address, f.first_name, f.last_name, "
    + "s.first_name || ' ' || s.last_name student_name, "
    + "i.id internship_id, i.project_title, "
    + "min(a.scheduled_on) activity_scheduled_on "
    + "from activities a "
    + "join internships i "
    + "on a.internship_id = i.id "
    + "join users s "
    + "on i.student_user_id = s.id "
    + "join participants p "
    + "on i.id = p.internship_id "
    + "join users f "
    + "on p.user_id = f.id "
    + "where i.status in ('ready', 'approved', 'in progress', 'activity due') "
    + "and p.accepted_on is not null "
    + "and a.completed_on is null "
    + "and a.scheduled_on < (current_date + 2) "
    + "and f.role = 'advisor' "
    + "group by "
    + "f.id, f.role, f.email_address, f.first_name, f.last_name, "
    + "s.first_name || ' ' || s.last_name, "
    + "i.id, i.project_title ) "
    + "select d.user_id, d.role, d.email_address, "
    + "d.first_name, d.last_name, d.student_name, "
    + "d.internship_id, d.project_title,  "
    + "to_char(d.activity_scheduled_on, 'yyyy-mm-dd') activity_scheduled_on "
    + "from reminders_due d "
    + "left join reminders_sent s "
    + "on d.user_id = s.user_id "
    + "and d.internship_id = s.internship_id "
    + "and d.activity_scheduled_on = s.activity_scheduled_on "
    + "where s.id is null ";

var qInsertReminderSent = ""
    + "insert into reminders_sent " 
    + "(user_id, internship_id, activity_scheduled_on) " 
    + "values ($1, $2, to_date($3, 'yyyy-mm-dd')) ";

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

var activityDue = function(d) {
    // one day in milliseconds...used within a few helper functions
    var od = 1000*60*60*24; 
    // today
    var t = new Date();
    // two days from now
    var dd = new Date(t.getTime() + 2*od);

    var r = false;

    for (var i = 0; i < d.activities.length; i++) {
        var co = d.activities[i].completed_on;
        var so = d.activities[i].scheduled_on;
        if (so && !(co)) {
            var cd = new Date(so);
            if (cd < dd) {
                r = true;
            }
        };
    };
    return r;
};

var checkInternshipStatus = function(d) {
    // d is my internship
    // s is my status
    var s = "pending";
    
    // aa is advisor accepted
    var aa = false;
    
    // sa is sponsor accepted
    var sa = false;

    // t is today
    var t = new Date();

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
    if (s == "ready" && d.admin_approved_on) {
        s = "approved";
    };

    // are we in progress
    if (s == "approved" && d.employment_begin_on) {
        // if employment begin on or before today
        var c = new Date(d.employment_begin_on);
        if (t > c) {
            s = "in progress";
        };
    };

    // do we have a milestone due
    if (["ready", "approved", "in progress"].indexOf(s) && activityDue(d)) {
        s = "activity due";
    }
    
    // are we completed
    if (["approved", "in progress"].indexOf(s) && d.colloquium_presentation_on) {
        // if colloquium presentation on or before today
        var c = new Date(d.colloquium_presentation_on);
        if (t > c) {
            s = "completed";
        }
    };

    // are we cancelled
    if (d.cancelled_on) {
        s = "cancelled";
    };
    
    return s;
    
};

var checkSetInternshipStatus = function(d) {
    // d has an internship_id
    // get the internship from the database
    var a = [
        d.internship_id ];
    
    client.query(qGetInternship, a, function(err, result) {
        var internship = result.rows[0];
        
        client.query(qGetParticipants, a, function(err, result) {
            internship.participants = result.rows;

            client.query(qGetActivities, a, function(err, result) {
                internship.activities = result.rows;
                
                var cstatus = checkInternshipStatus(internship);
                
                if (internship.status != cstatus) {
                    internship.status = cstatus;
                    a.push(cstatus);
                    client.query(qUpdateInternshipStatus, a, function(err, result) {
                        console.log("internship status updated in db...but the app moves on, async like");
                    });
                };
            });
        });
    });
};

var validateUser = function(req, res, next) {
    var u = req.session.user.id;
    var d = req.session.internship;
    var p = [d.student_user_id];

    client.query(qGetAdminIds, function(err, result) {
        for (var i = 0; i < result.rows.length; i++) {
            p.push(result.rows[i].id);
        };
            
        for (var i = 0; i < d.participants.length; i++) {
            p.push(d.participants[i].user_id);
        };
        
        if (p.indexOf(u) == -1) {
        //tsk tsk...trying to look at something you ought not?
            res.redirect("/logout");
        } else {
            next();
        };
    });
};

var sendEmail = function(req, res, next) {
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
        to: req.email[0], // list of receivers
        subject: req.email[1], // Subject line
        text: req.email[2], // plaintext body
        html: req.email[2] + "<p><p>Thank you! " // html body
    };

    nodemailer.sendMail(mailOptions, function(error){
        if(error){
            console.log(error);
            if (req.flash) {
                req.flash("error", "failed to send email!");
            } else {
                console.log("no flashy, flash!");
            };
        } else {
            console.log("email sent!");
        };
        transport.close(); // lets shut down the connection pool
        
        next();
    });
};

// methods exposed to app
exports.getUser = function(req, res, next){
    var d = req.body.user;
    
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
        var a = [
            d.email_address,
            d.password ];

        client.query(qGetUser, a, function(err, result) {
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

    var a = [
        d.email_address,
        d.role,
        d.password,
        d.last_name,
        d.first_name ];

    client.query(qEmailAddressExists, [a[0]], function(err, result) {
        if (result.rows.length == 0) {
            client.query(qInsertNewUser, a, function(err, result) {
                if (err) { console.log(err) };
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
    var a = [];
    
    if (d.role == "student") {
        // if student, get internships I own
        q = qGetStudentInternships;
        a = [d.id];
    } else if (d.role == "admin") {
        // if admin, get all active internships
        q = qGetAllActiveInternships;
    } else if (d.role == "sponsor" || d.role == "advisor") {
        // if advisor/sponsor, get internships I've accepted
        q = qGetParticipantInternships;
        a = [d.id];
    };

    client.query(q, a, function(err, result) {
        //if (err) { console.log(err) };
        if (err) { console.log(err) };
        if (result.rows) { 
            req.session.internships = result.rows;
        } else {
            req.session.internships = [];
        }
        next();
    });
};

exports.createInternship = function(req, res, next) {
    var d = req.body.newIntern;

    var a = [
        d["student_user_id"],
        d["status"],
        d["project_title"],
        d["project_description"],
        d["university_student_number"],
        d["number_of_credits"],
        d["quarter"],
        d["year"],
        d["sponsor_company"],
        d["sponsor_address"] ];
    
    client.query(qInsertInternship, a, function(err, result) {
        next();
    });
};

exports.getInternship = function(req, res, next) {
    var d = req.session.user;
    
    var a = [
        req.params["internId"] ]; 

    client.query(qGetInternship, a, function(err, result) {
        if (result.rows.length==1) {
            req.session.internship = result.rows[0];
            
            client.query(qGetParticipants, a, function(err, result) {
                req.session.internship.participants = result.rows;
                // maybe, now we check to make sure user is associated with this internship, otherwise send back to list eh?
                client.query(qGetActivities, a, function(err, result) {
                    req.session.internship.activities = result.rows;

                    validateUser(req, res, next);
                });
            });
        } else {
            req.flash("error", "whoop...can't seem to get that internship, pick again!");
            res.redirect("/" + req.session.user.id + "/intern/list");
        };

    });
};


exports.updateInternship = function(req, res, next) {
    var d = req.session.user;
    d.internship = req.body.editIntern;
    console.log(JSON.stringify(d));
    // need internship_id for check/set status...bah
    d.internship_id = d.internship["id"];
    var a = [];
    var s = [
        d.internship["id"],
        new Date().toYMD() ];

    var o = req.body.operation;

    if (o == "cancel") {
        // maybe cancel should remove participants too...?
        // update the cancelled on date and check/set status
        client.query(qUpdateInternshipCancelled, s, function(err, result) {
            if (err) { console.log(err) };
            checkSetInternshipStatus(d);
            req.flash("info", "internship cancelled!");
            next();
        });
    } else if (o == "reopen") {
        // nullify cancelled on and maybe some other dates that drive status
        s.pop();
        client.query(qUpdateInternshipReopened, s, function(err, result) {
            if (err) { console.log(err) };
            checkSetInternshipStatus(d);
            req.flash("info", "internship reopened!");
            next();
        });
    } else if (o == "approve") {
        // update approved on date and check/set status
        client.query(qUpdateInternshipApproved, s, function(err, result) {
            if (err) { console.log(err) };
            checkSetInternshipStatus(d);
            req.flash("info", "internship approved!");
            next();
        });
     } else if (o == "save") {
        a = [
            d.internship["project_title"],
            d.internship["project_description"],
            d.internship["university_student_number"],
            d.internship["number_of_credits"],
            d.internship["quarter"],
            d.internship["year"],
            d.internship["sponsor_company"],
            d.internship["sponsor_address"],
            d.internship["employment_begin_on"] || null,
            d.internship["colloquium_presentation_on"] || null,
            d.internship["id"],
            d["id"] ];

        console.log("foobar");
        console.log(JSON.stringify(d));
        console.log(a);
        
        client.query(qUpdateInternship, a, function(err, result) {
            if (err) {
              if (err) { console.log(err) };
              req.flash('error', "internship *not* saved!");
            } else {
              checkSetInternshipStatus(d);
              req.flash('info', "internship saved!");
            }
            next();
        });
    };
};

exports.getParticipant = function(req, res, next) {
    var d = req.body.requestParticipant;

    var a = [
        d.email_address,
        d.role,
        d.password,
        d.last_name,
        d.first_name ];

    client.query(qEmailAddressExists, [a[0]], function(err, result) {
        if (result.rows.length == 0) {
            // requested participant is not yet a user...
            client.query(qInsertNewUser, a, function(err, result) {
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
    var i = req.session.internship;
    var d = req.body.requestParticipant;
    
    d.requested_on = new Date().toYMD();
    
    var shasum = crypto.createHash("sha1");
    
    shasum.update(i["id"] + d["email_address"] + d["requested_on"]);
    d.request_hash = shasum.digest("hex");

    var a = [
        i["id"],
        d["id"],
        d["request_hash"],
        d["requested_on"] ];
    
    client.query(qParticipantExists, [a[0], a[1]], function(err, result) {
        if (result.rows.length == 0) {
            client.query(qInsertParticipant, a, function(err, result) {
                if (err) { console.log(err) };
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

    var a = [
        d.participant_id ]; 

    client.query(qClearApproved, [d.internship_id], function(err, result) {
        if (err) { console.log(err) };
        client.query(qRemoveParticipant, a, function(err, result) {
            req.flash("info", "participant removed!");
            checkSetInternshipStatus(d);
            next();
        });
    });
};

exports.sendRequest = function(req, res, next) {
    var d = req.body.requestParticipant;
    var u = req.session.user;
    var r = process.env.EMAIL_RECEIVER || d["email_address"];
    var s = "please contribute to a successful internship!";
    
    var m = "Greetings! "
        + "<p><p> "
        + "If you would kindly like to participate in "
        + u["first_name"] + " " + u["last_name"] + "'s " 
        + "internship, please, enthusiastically click the following hyperlink! "
        + "<p><p> "
        + "http://" + d["host"] + "/accept/" + d["request_hash"] + " "
        + "<p><p>" ; 

    req.email = [r, s, m];

    sendEmail(req, res, next);
};

exports.acceptParticipant = function(req, res, next) {
    var d = {};

    d.accepted_on = new Date().toYMD();
    d.request_hash = req.params["requestHash"];

    var a = [
        d.accepted_on,
        d.request_hash ];
    
    client.query(qUpdateParticipantAcceptedOn, a, function(err, result) {
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

exports.createActivity = function(req, rex, next) {
    var d = req.body.activityNew;
    var i = req.session.internship;
    d.internship_id = i.id;
    var a = [
        d["internship_id"],
        d["description"],
        d["scheduled_on"] ];

    client.query(qInsertActivity, a, function(err, result) {
        req.flash("info", "activity added!");
        checkSetInternshipStatus(d);
        next();
    });
};

exports.getActivity = function(req, res, next) {
    var d = req.session.internship;
    d.activity_id = req.params["activityId"];
    
    var a = [
        d["activity_id"] ];

    client.query(qGetActivity, a, function(err, result) {
        if (err) { console.log(err) };
        req.session.activity = result.rows[0];
        
        client.query(qGetComments, a, function(err, result) {
            if (err) { console.log(err) };
            req.session.activity.comments = result.rows;
            next();
        });
    });
};

exports.editActivity = function(req, res, next) {
    var d = req.body.activityEdit;
    var o = req.body.operation;
    var q = "";

    var a = [
        d["description"], 
        d["scheduled_on"] || null,
        d["completed_on"] || null,
        d["activity_id"] ];

    if (o == "save") {
        
        client.query(qUpdateActivitySave, a, function(err, result) {
            if (err) { console.log(err) };
            d["internship_id"] = req.session.internship.id;
            checkSetInternshipStatus(d);
            req.flash("info", "activity saved!");
            next();
        });
    } else if (o == "delete") {
        client.query(qDeleteComments, [a[3]], function(err, result) {
            if (err) { console.log(err) };
            client.query(qUpdateActivityDelete, [a[3]], function(err, result) {
                if (err) { console.log(err) };
                d["internship_id"] = req.session.internship.id;
                checkSetInternshipStatus(d);
                req.flash("info", "activity deleted!");
                next();
            });
        });
    };
};

exports.createComment = function(req, res, next) {
    var d = req.body.commentNew;

    var a = [
        d["activity_id"],
        d["user_id"],
        new Date().toYMD(),
        d["comment"] ];

    client.query(qInsertComment, a, function(err, result) {
        req.flash("info", "comment added!");
        next();
    });

};

exports.sendPasswordResetEmail = function(req, res, next) {
    var d = req.body.recoverPassword;
    var a = [
        d["email_address"] ];
    
    req.emailFound = false;

    client.query(qFindUser, a, function(err, result) {
        if (result.rows) {
            req.emailFound = true;
            var c = result.rows[0].current_datetime;
            var shasum = crypto.createHash("sha1");
            
            shasum.update(a[0] + c);
            a.push(shasum.digest("hex"));

            client.query(qInsertPasswordRecovery, a, function(err, result) {
                if (err) { console.log(err) };
                // then send the email with a link /reset_password
                console.log("send an email now!");

                var r = process.env.EMAIL_RECEIVER || a[0];
                var s = "reset your password for internship participation";
                var m = "Greetings! "
                    + "<p><p> "
                    + "In order to reset your password to access the internship(s) you are involved in, "
                    + "<p>"
                    + "please, confidently click the following hyperlink! "
                    + "<p><p> "
                    + "http://" + d["host"] + "/reset_password/" + a[1] + " "
                    + "<p><p>" ; 

                req.email = [r, s, m];

                sendEmail(req, res, next);
            });
        } else {
            // didn't find email...no biggie.
            next();
        }
    });
};

exports.getPasswordRecovery = function(req, res, next) {
    // use the recovery_hash to get the email_address we're working with and stuff that into the request
    var a = [
        req.params["recoveryHash"] ];

    client.query(qGetPasswordRecovery, a, function(err, result) {
        if (err) { console.log(err) };
        if (result.rows.length > 0) {
            req.email_address = result.rows[0].email_address;
            next();
        } else {
            next();
        };
    });
};

exports.resetPassword = function(req, res, next) {
    var d = req.body.resetPassword;
    var a = [
        d["password"],
        d["email_address"] ];

    console.log("foo");
    console.log(JSON.stringify(d));
    console.log(a);

    client.query(qUpdateUserPassword, a, function(err, result) {
        if (err) {
            console.log(err);
            req.resetSuccessful = false;
        } else {
            req.resetSuccessful = true;
        };
        next();
    });
};

exports.checkSendReminders = function() {
    // get students and (accepted) advisors associated with active internships
    // which have scheduled activities within the next couple days
    // but have not been completed  
    client.query(qGetUsersDueReminderOfActivity, function(err, result) {
        if (err) { console.log(err) };
        if (result.rows.length > 0) {
            for (var i = 0; i < result.rows.length; i++) {
                var u = result.rows[i];
                var r = process.env.EMAIL_RECEIVER || u.email_address;

                if (u.role == "student") {
                    var s = "upcoming activity due for your internship!"; 
                    var m = "Greetings <b>" + u.first_name + "</b>, "
                        + "<p><p> "
                        + "This is just a friendly reminder that you have an upcoming activity due "
                        + "<br/>"
                        + "scheduled for <b>" + u.activity_scheduled_on + "</b>"
                        + "<br/>"
                        + "toward the completion of your internship project titled: <b>" + u.project_title + "</b>"
                        + "<p><p> "
                        + "Please visit: http://www.redshirts.toopointoh.org to login and have a look! ";
                    
                } else if (u.role == "advisor") {
                    var s = "upcoming activity due for " + u.student_name + "'s internship!"; 
                    var m = "Greetings Mr. or Ms. <b>" + u.last_name + "</b>, "
                        + "<p><p> "
                        + "This is just a friendly reminder that you have an upcoming activity due "
                        + "<br/>"
                        + "scheduled for <b>" + u.activity_scheduled_on + "</b>"
                        + "<br/>"
                        + "toward the completion of " + u.student_name + "'s internship project titled: <b>" + u.project_title + "</b>"
                        + "<p><p> "
                        + "Please visit: http://www.redshirts.toopointoh.org to login and have a look! ";
                };

                var a = [
                    u.user_id,
                    u.internship_id,
                    u.activity_scheduled_on ];
  
                // hacky little thing in order to avoid refactoring sendEmail right now
                var req = {};
                var res = {};
                req.email = [r, s, m];

                sendEmail(req, res, function() {
                    console.log("whoopee!!");
                });
                
                client.query(qInsertReminderSent, a, function(err, result) {
                   if (err) { console.log(err) };
                   console.log("wheee!");
                });
            };
            
        } else {
            // no work to do
        }
        
    });
    
};