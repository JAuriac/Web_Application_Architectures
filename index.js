const express = require("express");
const app = express();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const session = require("express-session");
const bodyParser = require('body-parser');
const router = express.Router();

app.use(session({secret: 'ssh',saveUninitialized: true,resave: true}));
app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));

var sess; // global session, because i think it is better for this precise assignment

const db_name = path.join(__dirname, "data", "faq.db");
const db = new sqlite3.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'faq.db'");
});


const sql_create = `CREATE TABLE IF NOT EXISTS Faq (
  faqId INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  reponse TEXT NOT NULL,
  domaine TEXT NOT NULL,
  usersIds TEXT NOT NULL,
  votersIds TEXT NOT NULL
);`;

const sql_create_bis = `CREATE TABLE IF NOT EXISTS User (
  userId INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  encrypted_password TEXT NOT NULL
);`;

db.run(sql_create, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'Faq' table");
})

db.run(sql_create_bis, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'User' table");
})

// app.listen(3000, () => {
//   console.log("Server started (http://localhost:3000/) !");
// });

app.listen(process.env.PORT || 3000,() => {
  console.log(`App started on port ${process.env.PORT || 3000}`);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
//app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false })); // <--- middleware configuration

app.get("/", (req, res) => {
  const sqlf = "SELECT * FROM Faq";
  var b;
  db.all(sqlf, [], (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    arr = [];
    for (let i = 0; i < rows.length; i++)
    {
      l = rows[i].votersIds.split(";")
      arr[i] = l.length;
    }
    let i = arr.indexOf(Math.max(...arr));
    r = rows[i];
    console.log(r);
    res.render("sign_up", { model: r, sess: sess });
  });
});
app.get("/sign_in", (req, res) => {
  res.render("sign_in", { sess: sess });
});
app.get("/about", (req, res) => {
  if (typeof sess === 'undefined'){res.redirect('/'); return;}
  res.render("about", { sess: sess });
});
app.get("/data", (req, res) => {
  if (typeof sess === 'undefined'){res.redirect('/'); return;}
  const test = {
    title: "Test",
    items: ["one", "two", "three"]
  };
  res.render("data", { model: test, sess: sess });
});
app.get("/faq", (req, res) => {
  if (typeof sess === 'undefined'){res.redirect('/'); return;}
  // console.log("Dans faq")
  // console.log(sess)
  const sql = "SELECT * FROM Faq";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("faq", { model: rows, sess: sess });
  });
});
// POST /create
app.post("/faq", (req, res) => {
  // const sqlb = "SELECT userId FROM User WHERE nickname LIKE ? OR email LIKE ?";
  // const lareqb = [sess.idt];
  const sqlb = "SELECT userId FROM User WHERE nickname LIKE '"+sess.idt+"' OR email LIKE '"+sess.idt+"'";
  // console.log(sqlb);
  var userIdt = [];
  db.all(sqlb, [], (err, rows) => {
    userIdt = rows[0].userId;
    sess.userId = userIdt;
    // console.log(userIdt);
    const sql = "INSERT INTO Faq (question,reponse,domaine,usersIds,votersIds) VALUES (?,?,?,?,?)";
    const faq = [req.body.question, req.body.reponse, req.body.domaine, userIdt, userIdt];
    db.run(sql, faq, err => {
    // if (err) ...
    res.redirect("/faq");
    });
  });
});

app.post("/upvote", (req, res) => {
  const sqlc = "SELECT userId FROM User WHERE nickname LIKE '"+sess.idt+"' OR email LIKE '"+sess.idt+"'";
  var userIdt = [];
  console.log("r");
  console.log(req.body.r);
  db.all(sqlc, [], (err, rows) => {
    userIdt = rows[0].userId;
    sess.userId = userIdt;

    console.log("r");
    console.log(req.body.r);
    const sqld = "SELECT votersIds FROM Faq WHERE reponse LIKE '"+req.body.r+"'";
    db.all(sqld, [], (errBis, res) => {
      // console.log("res");
      // console.log(res);
      // console.log(res[0].votersIds);
      // console.log(typeof res);
      // console.log(typeof res[0].votersIds);
      arr = res[0].votersIds.split(";")
      b = true;
      for (const i of arr)
      {
        if (i == userIdt) {b = false;}
      }
      if (b == true)
      {
        const sqle = "UPDATE Faq SET votersIds='"+res[0].votersIds+";"+userIdt+"' WHERE reponse='"+req.body.r+"'";
        console.log(sqle);
        db.all(sqle, [], (err, rows) => {
          if (err) {
            return console.error(err.message);
          }
          // res.render("faq", { model: rows, sess: sess });
        });
      }
    });
    res.redirect("/faq");
    // res.render("faq", { model: rows, sess: sess });
  });
});

// POST /chercher perso
app.post("/chercher", (req, res) => {
  const sql = "SELECT * FROM Faq WHERE question LIKE '%"+req.body.chercher+"%' OR reponse LIKE '%"+req.body.chercher+"%'";
  db.run(sql, err => {
    // if (err) ...
    res.redirect("/faq");
  });
});
app.post("/faq/motcle", (req, res) => {
  const sql = "SELECT * FROM Faq WHERE question LIKE ? OR reponse LIKE ?";
  const lareq = "%" + req.body.recherche + "%";
  const faq = [lareq, lareq];
  db.all(sql, faq, (err, rows) => {
    // if (err) ...
    res.render("faq", { model: rows });
  });
});
app.get("/faq/:domaine", (req, res) => {
  const domaine = req.params.domaine;
  const sql = "SELECT * FROM Faq WHERE domaine = ?"
  db.all(sql, domaine, (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("faq", { model: rows });
  });
});



const bcrypt = require("bcryptjs");
app.get("/signup", async (req, res) => {
  res.render("signup");
});
app.post("/signup", async (req, res) => {
  const sql = "INSERT INTO User (email,nickname,encrypted_password) VALUES (?,?,?)";
  const hashedPassword = await bcrypt.hash(req.body.encrypted_password, 8);
  const values = [req.body.email, req.body.nickname, hashedPassword];
  db.run(sql, values, (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("sign_in", { model: rows });
  });
});

app.get("/signin", (req, res) => {
  if (typeof sess !== 'undefined'){console.log("sess pas null"); console.log(sess); res.redirect('/about'); return;}
  res.render("signin");
});
app.post("/signin", (req, res) => {
  console.log("là")
  if (typeof sess !== 'undefined'){console.log("sess pas null"); console.log(sess); res.redirect('/about'); return;}
  user = req.body.idt;
  password = req.body.plain_password;
  console.log(user)
  console.log(password)
  sql = "SELECT encrypted_password, nickname FROM User WHERE (nickname == '" + user + "' or email == '" + user + "')";
  db.all(sql, [], (err, result) => {
	console.log(result[0].encrypted_password)
    if (result[0] != null) {      
      bcrypt.compare(password, result[0].encrypted_password, function (err, valid) {
        if (valid) {
          console.log("Login succeed");
          sess = req.session;
          sess.idt = req.body.idt;
          sess.password = req.body.plain_password;
          sess.nick = result[0].nickname;
          // res.end('done');
          res.redirect("faq");
        } else {
          console.log("The password doesn't match : " + password);
        }
      });
    } else {
      console.log("The identifier isn't found : " + user);
    }
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if(err) {
        return console.log(err);
    }
    console.log("Delete sess (logout)");
    sess = undefined;
    res.render("sign_up", { sess: sess });
  });
});