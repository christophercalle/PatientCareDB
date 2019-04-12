const express = require('express');
const mustacheExpress = require('mustache-express');
const app = express();
const bodyParser = require('body-parser');
const pgp = require('pg-promise')();
const connectionString = "postgres://fmngwkmfyfhdxv:fa0290f880e479e8b59d5c6ce5a8b7d745aed09ca2ca2f26c8da42c56e6a231d@ec2-107-22-164-225.compute-1.amazonaws.com:5432/damvt1g6umvmn4?ssl=true";
const db = pgp(connectionString);
const request = require('request'); 
const session = require('express-session');
const sess = {
    store: new (require('connect-pg-simple')(session))(),
    secret: 'cat',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }};
const port = process.env.PORT || 3000;


const HOSPITAL_PARAMS = '/:hospitalname/:hospitalid';
const EMPLOYEE_PARAMS = '/:username/:employeeid';

app.use('/styles', express.static('styles')); //access to css files
app.use('/scripts', express.static('scripts')); // access to js files

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sess));

app.engine('mustache', mustacheExpress());

app.set('views', "./views"); 
app.set('view engine', 'mustache');


// ----- hospital login page

app.get('/', (req, res) => {
    res.render('./index');
});


// ----- register a new hospital

app.post('/register-hospital', (req, res) => {

    let hospitalname = req.body.hospitalname;
    let accesscode = req.body.accesscode;
    let address = req.body.address;
    let city = req.body.city;
    let state = req.body.state;
    let zipcode = req.body.zipcode;
    let telephone = req.body.telephone;
    
    db.none('SELECT hospitalname, hospitalid FROM hospitals WHERE hospitalname = $1', [hospitalname]).then(() => {
        db.none('INSERT INTO hospitals(hospitalname, accesscode, address, city, state, zipcode, telephone) VALUES($1, $2, $3, $4, $5, $6, $7)', [hospitalname, accesscode, address, city, state, zipcode, telephone]).then(() => {
            db.one('SELECT hospitalname, hospitalid FROM hospitals WHERE hospitalname = $1', [hospitalname]).then(hospital => {
                let hospitalid = hospital.hospitalid;
                res.redirect('/' + hospitalname + '/' + hospitalid + '/home');
            });
        });
    }).catch(e => {
        let errorType = e.name;
        if (errorType === 'QueryResultError') {
            res.redirect('..');
        } else {
            console.log(e);
        }
    });
});


// ----- logging in a hospital

app.post('/log-in-hospital', (req, res) => {

    let hospitalname = req.body.hospitalname;
    let accesscode = req.body.accesscode;

    db.one('SELECT hospitalid, hospitalname FROM hospitals WHERE hospitalname = $1 AND accesscode = $2', [hospitalname, accesscode]).then(hospital => {
        let hospitalname = hospital.hospitalname;
        let hospitalid = hospital.hospitalid;

        res.redirect('/' + hospitalname + '/' + hospitalid + '/home');
    }).catch(e => {
        let errorType = e.name;

        if ( errorType === 'QueryResultError') {
            res.redirect('..');
        } else {
            console.log(e);
        };
    });
});


// ----- employee login page

app.get(HOSPITAL_PARAMS + '/home', (req, res) => {
    let hospitalid = req.params.hospitalid;

    db.one('SELECT hospitalname, address, city, state, zipcode, telephone, hospitalid FROM hospitals WHERE hospitalid = $1', [hospitalid]).then(hospital => {

        res.render('hospital-home', {hospital: hospital});
    });
});


// ----- register an employee

app.post(HOSPITAL_PARAMS + '/register-employee', (req, res) => {

    let hospitalid = req.params.hospitalid;

    let username = req.body.username;
    let password = req.body.password;
    let employeefirstname = req.body.employeefirstname;
    let employeelastname = req.body.employeelastname;
    let address = req.body.address;
    let city = req.body.city;
    let state = req.body.state;
    let zipcode = req.body.zipcode;
    let telephone = req.body.telephone;
    
    // validates that a username doesnt already exist
    db.none('SELECT username, employeeid FROM employees WHERE username = $1', [username]).then(() => {

        // creates a new user
        db.none('INSERT INTO employees(username, password, employeefirstname, employeelastname, address, city, state, zipcode, telephone, hospitalid) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [username, password, employeefirstname, employeelastname, address, city, state, zipcode, telephone, hospitalid]).then(() => {

            // grabs the user information
            db.one('SELECT employees.username, employees.employeeid, hospitals.hospitalname, hospitals.hospitalid FROM employees INNER JOIN hospitals ON employees.hospitalid = hospitals.hospitalid WHERE username = $1', [username]).then(result => {

                let hospitalname = result.hospitalname;
                let hospitalid = result.hospitalid;

                let username = result.username;
                let employeeid = result.employeeid;

                // sends employee to their homepage
                res.redirect('/' + hospitalname + '/' + hospitalid + '/' + username + '/' + employeeid + '/home');
            });
        });
    }).catch(e => {
        let errorType = e.name;

        // returns user to the login page if any information is not valid
        if (errorType === 'QueryResultError') {
            db.one('SELECT hospitalname, address, city, state, zipcode, telephone, hospitalid FROM hospitals WHERE hospitalid = $1', [hospitalid]).then(hospital => {

                let hospitalname = hospital.hospitalname;
                let hospitalid = hospital.hospitalid;
                res.redirect('/' + hospitalname + '/' + hospitalid + '/home');
            });
        } else {
            console.log(e);
        };
    });
});


// ----- logging in an employee

app.post(HOSPITAL_PARAMS + '/log-in-employee', (req, res) => {
    
    let hospitalname = req.params.hospitalname;
    let hospitalid = req.params.hospitalid;

    let username = req.body.username;
    let password = req.body.password;

    // checks that the username exists and correlating password is valid
    db.one('SELECT employees.employeeid, employees.username, employees.password, employees.hospitalid, hospitals.hospitalname, hospitals.hospitalid FROM employees INNER JOIN hospitals ON employees.hospitalid = $1 AND hospitals.hospitalid = $1 WHERE employees.username = $2 AND employees.password = $3', [hospitalid, username, password]).then(result => {

        let hospitalname = result.hospitalname;
        let hospitalid = result.hospitalid;

        let username = result.username;
        let employeeid = result.employeeid;

        // sends employee to their home page
        res.redirect('/' + hospitalname + '/' + hospitalid + '/' + username + '/' + employeeid + '/home');
        
    }).catch(e => {
        let errorType = e.name;

        if (errorType === 'QueryResultError') {
            db.one('SELECT hospitalid, hospitalname, address, city, state, zipcode, telephone FROM hospitals WHERE hospitalname = $1', [hospitalname]).then(hospital => {

                let hospitalname = hospital.hospitalname;
                let hospitalid = hospital.hospitalid;
                res.redirect('/' + hospitalname + '/' + hospitalid + '/home');
            });
        } else {
            console.log(e);
        };
    });
});


// ----- employee home page

app.get(HOSPITAL_PARAMS + EMPLOYEE_PARAMS + '/home',(req, res) => {

    let hospitalname = req.params.hospitalname;
    let hospitalid = req.params.hospitalid;
    let username = req.params.username;
    let employeeid = req.params.employeeid;

    // grabs all the patients correlating to the hospital
    db.any('SELECT patients.firstname, patients.lastname, patients.dob, patients.sex, patients.hospitalid, hospitals.hospitalid FROM patients INNER JOIN hospitals ON hospitals.hospitalid = $1 WHERE patients.hospitalid = $1', [hospitalid]).then(patients => {

        res.render('employee-home', {patients : patients, hospitalname : hospitalname, hospitalid : hospitalid, username : username, employeeid : employeeid});
    }).catch(e => {
        console.log(e);
    });
});


// ----- admitting a new patient page

app.get(HOSPITAL_PARAMS + EMPLOYEE_PARAMS + '/new-patient', (req, res) => {

    let employeeid = req.params.employeeid;

    // connect the patient to the hospital they are in
    db.one('SELECT employees.username, employees.employeeid, employees.hospitalid, hospitals.hospitalname, hospitals.hospitalid FROM employees INNER JOIN hospitals ON employees.hospitalid = hospitals.hospitalid WHERE employees.employeeid = $1', [employeeid]).then(result => {
        const countryname = [];

        // countries api
        request('https://restcountries.eu/rest/v2/all', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let info = JSON.parse(body);
                
                for (index in info) {
                    countryname.push({name : info[index].name});
                };
            };
            res.render('patients', {result : result, employeeid : employeeid, countryname : countryname});
        });
    }).catch(e => {
        console.log(e);
    });
});


// ----- admitting a patient

app.post(HOSPITAL_PARAMS + EMPLOYEE_PARAMS + '/admit-patient', (req, res) => {

    let hospitalid = req.params.hospitalid;
    let username = req.params.username;
    let employeeid = req.params.employeeid;
    
    let admissiondate = new Date();
    let firstname = req.body.firstname;
    let lastname = req.body.lastname;
    let dob = req.body.dob;
    let sex = req.body.sex;
    let maritalstatus = req.body.maritalstatus;
    let countryofbirth = req.body.countryofbirth;
    let address = req.body.address;
    let city = req.body.city;
    let state = req.body.state;
    let zipcode = req.body.zipcode;
    let telephone = req.body.telephone;
    let email = req.body.email;
    let religion = req.body.religion;
    let citizen = req.body.citizen;
    let reasonforvisit = req.body.reasonforvisit;
    let medication = req.body.medication;
    let drugallergies = req.body.drugallergies;
    let roomnumber = req.body.roomnumber;
    let dischargedate = req.body.dischargedate;
    let surgical = req.body.surgical;
    let medical = req.body.medical;
    let psychiatric = req.body.psychiatric;
    let admissiontype = req.body.admissiontype;
    let communication = req.body.communication;
    let vision = req.body.vision;
    let hearing = req.body.hearing;
    let assistivedevices = req.body.assistivedevices;
    let toileting = req.body.toileting;
    let medicationadministration = req.body.medicationadministration;
    let feeding = req.body.feeding;
    let diettexture = req.body.diettexture;
    let ambulation = req.body.ambulation;
    let personalhygiene = req.body.personalhygiene;
    let oralhygiene = req.body.oralhygiene;
    let headofbedelevated = req.body.headofbedelevated;
    let additionalnotes = req.body.additionalnotes;
    let diagnosis = req.body.diagnosis;
    let operations = req.body.operations;
    let bloodtype = req.body.bloodtype;
    let ethnicity = req.body.ethnicity;

    // puts the patients into the database
    db.none('INSERT INTO patients(admissiondate, firstname, lastname, dob, sex, maritalstatus, address, countryofbirth, city, state, zipcode, telephone, email, religion, citizen, reasonforvisit, medication, drugallergies, roomnumber, hospitalid, dischargedate, surgical, medical, psychiatric, admissiontype, communication, vision, hearing, assistivedevices, toileting, medicationadministration, feeding, diettexture, ambulation, personalhygiene, oralhygiene, headofbedelevated, additionalnotes, diagnosis, operations, bloodtype, ethnicity) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)', [admissiondate, firstname, lastname, dob, sex, maritalstatus, address, countryofbirth, city, state, zipcode, telephone, email, religion, citizen, reasonforvisit, medication, drugallergies, roomnumber, hospitalid, dischargedate, surgical, medical, psychiatric, admissiontype, communication, vision, hearing, assistivedevices, toileting, medicationadministration, feeding, diettexture, ambulation, personalhygiene, oralhygiene, headofbedelevated, additionalnotes, diagnosis, operations, bloodtype, ethnicity]).then(() => {
        let hospitalname = req.params.hospitalname;
        res.redirect('/' + hospitalname + '/' + hospitalid + '/' + username + '/' + employeeid + '/home');
    }).catch(e => {
        console.log(e);
    });
});


// ---------------------- display all patients -----------------------------------------//

app.get(HOSPITAL_PARAMS + EMPLOYEE_PARAMS + '/all-patients', (req, res) => {
    let hospitalid = req.params.hospitalid;
    let hospitalname = req.params.hospitalname;
    let username = req.params.username;
    let employeeid = req.params.employeeid;

    
    db.any('SELECT * FROM patients WHERE hospitalid = $1', [hospitalid]).then(patient => {
        res.render('all-patients', {patient : patient, hospitalid : hospitalid, hospitalname : hospitalname, username : username, employeeid : employeeid});
    }).catch(e => {
        console.log(e);
    });
});

// ----- detailed patient info page

app.get(HOSPITAL_PARAMS + EMPLOYEE_PARAMS + '/:patientid/edit-info', (req, res) => {
    let hospitalid = req.params.hospitalid;
    let hospitalname = req.params.hospitalname;
    let username = req.params.username;
    let employeeid = req.params.employeeid;
    let patientid = req.params.patientid;

    db.one('SELECT * FROM patients WHERE hospitalid = $1 AND patientid = $2', [hospitalid, patientid]).then(patient => {
        const countryname = [];

        // countries api
        request('https://restcountries.eu/rest/v2/all', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let info = JSON.parse(body);
                
                for (index in info) {
                    countryname.push({name : info[index].name});
                };
            };
            let month = patient.dob.getMonth();
        if (month < 10) {
            month = [0, month].join("");
        }

        let day = patient.dob.getDate();
        if (day < 10) {
            day = [0, day].join("");
        }

        let year = patient.dob.getFullYear();

        if (patient.citizen === true) {
            patient.citizen = 'yes'
        } else {
            patient.citizen = 'no'
        }

        dob = [year+ "-"+ month+"-"+ day]
        
        res.render('edit-info', {patient : patient, dob : dob, hospitalname : hospitalname, username : username, employeeid : employeeid, countryname : countryname});
        });
    }).catch(e => {
        console.log(e);
    });
});


// ----- edit patient info page

app.post(HOSPITAL_PARAMS + EMPLOYEE_PARAMS + '/:patientid/edit-info', (req, res) => {
    
    let hospitalname = req.params.hospital;
    let hospitalid = req.params.hospitalid;
    let username = req.params.username;
    let employeeid = req.params.employeeid;
    let patientid = req.params.patientid;
    
    let admissiondate = req.body.admissiondate;
    let firstname = req.body.firstname;
    let lastname = req.body.lastname;
    let dob = req.body.dob;
    let sex = req.body.sex;
    let maritalstatus = req.body.maritalstatus;
    let countryofbirth = req.body.countryofbirth;
    let address = req.body.address;
    let city = req.body.city;
    let state = req.body.state;
    let zipcode = req.body.zipcode;
    let telephone = req.body.telephone;
    let email = req.body.email;
    let religion = req.body.religion;
    let citizen = req.body.citizen;
    let reasonforvisit = req.body.reasonforvisit;
    let medication = req.body.medication;
    let drugallergies = req.body.drugallergies;
    let roomnumber = req.body.roomnumber;
    let dischargedate = req.body.dischargedate;
    let surgical = req.body.surgical;
    let medical = req.body.medical;
    let psychiatric = req.body.psychiatric;
    let admissiontype = req.body.admissiontype;
    let communication = req.body.communication;
    let vision = req.body.vision;
    let hearing = req.body.hearing;
    let assistivedevices = req.body.assistivedevices;
    let toileting = req.body.toileting;
    let medicationadministration = req.body.medicationadministration;
    let feeding = req.body.feeding;
    let diettexture = req.body.diettexture;
    let ambulation = req.body.ambulation;
    let personalhygiene = req.body.personalhygiene;
    let oralhygiene = req.body.oralhygiene;
    let headofbedelevated = req.body.headofbedelevated;
    let additionalnotes = req.body.additionalnotes;
    let diagnosis = req.body.diagnosis;
    let operations = req.body.operations;
    let bloodtype = req.body.bloodtype;
    let ethnicity = req.body.ethnicity;

    // resets all the patient data to the new defined values
    db.any('UPDATE patients SET firstname = $1, lastname = $2, dob = $3, sex = $4, maritalstatus = $5, countryofbirth = $6, address = $7, city = $8, state = $9, zipcode = $10, telephone = $11, email = $12, religion = $13, citizen = $14, reasonforvisit = $15, medication = $16, drugallergies = $17, roomnumber = $18, hospitalid = $19, dischargedate = $20, surgical = $21, medical = $22, psychiatric = $23, admissiontype = $24, communication = $25, vision = $26, hearing = $27, assistivedevices = $28, toileting = $29, medicationadministration = $30, feeding = $31, diettexture = $32, ambulation = $33, personalhygiene = $34, oralhygiene = $35, headofbedelevated = $36, additionalnotes = $37, diagnosis = $38, operations = $39, bloodtype = $40, ethnicity = $41 WHERE patientid = $42', [firstname, lastname, dob, sex, maritalstatus, countryofbirth, address, city, state, zipcode, telephone, email, religion, citizen, reasonforvisit, medication, drugallergies, roomnumber, hospitalid, dischargedate, surgical, medical, psychiatric, admissiontype, communication, vision, hearing, assistivedevices, toileting, medicationadministration, feeding, diettexture, ambulation, personalhygiene, oralhygiene, headofbedelevated, additionalnotes, diagnosis, operations, bloodtype, ethnicity, patientid]).then(() => {

        res.redirect('/' + hospitalname + '/' + hospitalid + '/' + username + '/' + employeeid + '/all-patients');
    }).catch(e => {
        console.log(e);
    })
})

// starts the server

app.listen(port, (req, res) => {
    console.log('Server running...');
});
