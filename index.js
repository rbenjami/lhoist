const express = require('express');
const app = express();
const admin = require("firebase-admin");
const basicAuth = require('express-basic-auth');

var serviceAccount = require("./lhoist-firebase-adminsdk-u8xra-2485c1740f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lhoist-default-rtdb.europe-west1.firebasedatabase.app"
});

const auth = admin.auth();
 
app.use(basicAuth({
    users: { admin: 'fMc7uschwWLyaF4F' },
    challenge: true
}));
app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.urlencoded({
  extended: true
  }));

app.get('/', async (req, res) => {
  console.log('Hello world received a request.');

  users = await auth.listUsers().then((userRecords) => userRecords.users);
  groups = groupBy(users, (user) => {
    return user.customClaims ? user.customClaims['group'] : 'undefined';
  })
  res.render('index', { users: users, groups: groups});
});

app.post('/change_user/:uid/disabled/:disabled', async (req, res) => {
  await auth.updateUser(req.params.uid, {disabled: req.params.disabled == 'true'});
  res.redirect('/');
});

app.post('/change_user/:uid/group', async (req, res) => {
  await auth.updateUser(req.params.uid, {displayName: req.body.group});
  await auth.setCustomUserClaims(req.params.uid, { group: req.body.group });
  res.redirect('/');
});

app.post('/change_group/:group/:disabled', async (req, res) => {
  users = await auth.listUsers().then((userRecords) => userRecords.users);
  groups = groupBy(users, (user) => {
    return user.customClaims ? user.customClaims['group'] : 'undefined';
  });
  await Promise.all(groups[req.params.group].map(async user => {
    await auth.updateUser(user.uid, {disabled: req.params.disabled == 'true'});
  }));
  res.redirect('/');
});

app.post('/add_users', async (req, res) => {
  users = req.body.users.split(',');
  group = req.body.group;
  password = req.body.password;

  await Promise.all(users.map(async user => {
    await auth.createUser({
      email: user,
      password: password,
    }).then(async u => {
      await auth.updateUser(u.uid, {displayName: group});
      await auth.setCustomUserClaims(u.uid, { group: group });
    });
  }));

  res.redirect('/');
});


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Hello world listening on port', port);
});


var groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) { 
    var v = key instanceof Function ? key(x) : x[key]; 
    (rv[v] = rv[v] || []).push(x); 
    return rv; 
  }, {});
};