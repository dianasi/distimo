describe('Distimo API', function () {
  var Distimo = require('../');

  var api = new Distimo({
    "clientID": "72149009774745197dacbf8e1a38f010516816f9",
    "clientSecret": "3d73f058bdd1a9614e71d4330d32ebcc9652d1c5",
    "privateKey": "08941b449167bc2ece5052b8236611e29d466b5c",
    accessToken: '5f657dc8b5cac1f3761a6e58bf7faac7f6feab5e',
    refreshToken: '8eeec55f1bc2dcae5db35f95311d036ed795763e'
  });

  it('should get applications', function (done) {
    api.applications(function (err, result) {
      if (err) {
        done(err);
      }
      else {
        console.log(result);
        done();
      }
    });
  });
});