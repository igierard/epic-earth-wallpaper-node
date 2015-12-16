#!/usr/bin/env node

var moment = require('moment');
var request = require('request');
var util = require('util');
var fs = require("fs");

var site_base = 'http://epic.gsfc.nasa.gov/';
var path_format = site_base + 'api/images.php?date=%s';
var image_dir = __dirname + '/images'
if(!fs.existsSync(image_dir)){
  fs.mkdirSync(image_dir);
}

var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};


function doRequest(targetDate){

  targetDate = targetDate || moment();
  var current_day = targetDate.format('YYYY-M-D');
  var path = util.format(path_format,current_day);
  console.log('checking', path);
  request(path,function(error, response, body){
    try{
      var obj = JSON.parse(body);
    } catch(e){
      setTimeout(function(){
        doRequest();
      },1000*60*20); //every 20 min.
      return;
    }
    if(!obj.length){
      targetDate = targetDate.subtract(1,'day');
      doRequest(targetDate);
      return;
    }
    if(fs.existsSync(image_dir + '/day')){
      var stored_day = fs.readFileSync(image_dir + '/day');
      if(current_day != stored_day){
        deleteFolderRecursive(image_dir);
        fs.mkdirSync(image_dir);
        fs.writeFileSync(image_dir + '/day',current_day);
      }
    }else{
      fs.writeFileSync(image_dir + '/day',current_day);
    }
    
    obj = obj.map(function(v){ return site_base + 'epic-archive/jpg/' + v['image'] + '.jpg'})
    
    
    obj.forEach(function(v,i){
      var out_path = image_dir +'/' + ("0000" + i).slice(-4) + '.jpg';
      if(!fs.existsSync(out_path)){
        console.log('saving',v,'as',out_path);
        request(v).pipe(fs.createWriteStream(out_path) );
      }
    });

    setTimeout(function(){
        doRequest();
    },1000*60*20); //every 20 min.

  });

}
doRequest(moment());