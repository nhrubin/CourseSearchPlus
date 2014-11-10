var appIdStr = 'app_id=c1ebfcb3-4982-4c4a-8f69-8c664abb7230&app_secret_key=rIUMURQA27n-KWqdUJroLb9IVxYHLaPYqkKBC6Qb5ZVTcBpdcWNR_BTA';

function isValidTime(lectureTime, validTimes) {
  for(var i = 0; i < validTimes.length; i++) {
    Date s1 = Date.parseExact(validTimes[i]["time_start"], "hh:mmtt");
    Date s2 = Date.parseExact(lectureTime["time_start"], "hh:mmtt");
    Date e1 = Date.parseExact(validTimes[i]["time_end"], "hh:mmtt");
    Date e2 = Date.parseExact(lectureTime["time_end"], "hh:mmtt");

    if(s1 <= s1 && e1 >= e2) {
      return true;
    }
  }
  return false;
}
      
function isValidDayTime(lectureTime,validTimes) {
  var times;
  if(lectureTime["days"].indexOf("M") > -1) {
    if(!validTimes["M"] || !isValidTime(lectureTime, validTimes["M"])) {
      return false;
    }
  }
  //Note this works because TR always comes after T if they are both sloted
  if(lectureTime["days"].indexOf("T") > -1 &&
     lectureTime["days"].indexOf("TR") != lectureTime["days"].indexOf("T") ) {
     if(!validTimes["T"] || !isValidTime(lectureTime, validTimes["T"])) {
        return false;
     }
  }
  if(lectureTime["days"].indexOf("W") > -1) {
    if(!validTimes["W"] || !isValidTime(lectureTime, validTimes["W"])) {
      return false;
    }
  }
  if(lectureTime["days"].indexOf("TR") > -1) {
    if(!validTimes["TR"] || !isValidTime(lectureTime, validTimes["TR"])) {
      return false;
    }
  }
  if(lectureTime["days"].indexOf("F") > -1) {
    if(!validTimes["F"] || !isValidTime(lectureTime, validTimes["F"])) {
      return false;
    }
  }
  if(lectureTime["days"].indexOf("S") > -1) {
    if(!validTimes["S"] || !isValidTime(lectureTime, validTimes["S"])) {
      return false;
    }
  }
}

function filterCourses(courses,criteria) {
  var validCourses = [];
  for(var i = 0; i < courses.length; i++) {
    var course = courses[i];  
    if((!criteria["minUnits"] || course["units"] > criteria["minUnits"]) &&
       (!criteria["maxUnits"] || course["units"] <= criteria["maxUnits"])) {
      var validLectures = [];
      for(var j = 0; j < course["lectures"].length; j++) {
        var lecture = course["lectures"][j];
        if(!criteria["instrLastName"] ||
          lecture["instructors"].indexOf(criteria["instrLastName"]) > -1) {
          if(!criteria["times"]) {
            validLectures.push(lecture);
          } else if(isValidDayTime(lecture["meetings"],criteria["times"])) {
            var validRecitations = [];
            for(var k = 0; k < lecture["recitations"].length; k++) {
              var recitation = lecture["recitations"][k];
              if(isValidDayTime(recitation["meetings"],criteria["times"])) {
                validRecitations.push(recitation);
              }
            }
            if(validRecitations.length > 0 || lecture["recitations"].length == 0) {
              lecture["recitations"] = validRecitations;
              validLectures.push(lecture);
            }
          }
        }
      }
      if(validLectures.length > 0 || course["lectures"].length == 0) {
        validCourses.push(course);
      }
    }
  }

  return validCourses;
}

function verifyPrereqs(prereqs, classes) {
  if(prereqs.search(/[0-9][0-9]-[0-9][0-9][0-9]/) == 0) {
    var class = prereqs.substring(0,2) + prereqs.substring (3,6);
    if(classes.indexOf(class) > -1) {
      return true;
    }
  }
  else {
    //Of the form (and/or, [left, right])
    var body = prereqs.substring(prereqs.indexOf("[")+1,prereqs.lastIndexOf("]"));
    var left;   
    var right;
    var parenLevel = 0;
    for( var i = 0; i<body.length; i++) {
      if(body[i] == "(")    
        parenLevel++;
      if(body[i] == ")")
        parenLevel--;
      if(body[i] === "," && parenLevel == 0) {
        left = body.substring(0,i);
        right = body.substring(i+2,body.length);
      }
    }

    if(prereqs.substring(1,3) === "or") {
      return verifyPrereqs(left, classes) || verifyPrereqs(right, classes);
    }
    if(prereqs.substring(1,4) === "and") {
      return verifyPrereqs(left, classes) && verifyPrereqs(right, classes);
    }
  }
  return false;
}

function filterPrereqs(courses, criteria, callback) {
  var args = {"courses":[]};
  for(var i = 0; i< courses.length; i++) {
    var courseID = courses[i]["number"];
    args["courses"].push(courseID.substring(0,2) + "-" + courseID.substring(2,5));
  }

  var verfiedCourses = [];
  $.ajax({
    type: "POST",
    url: 'prereqs.php',
    dataType: 'json',
    data: args,
    success: function (responseData, textStatus, jqXHR) {
        console.log("success");
        var response = JSON.parse(responseData);
        for(var i = 0; i< courses.length; i++) {
          if(response[args["courses"][i]]) {
            if(verifyPrereqs(response[args["courses"][i]],criteria["prereqs"])) {
              verifiedCourses.push(courses[i]);
            }
          }
        }
        callback(verifiedCourses);
      },
    error: function (responseData, textStatus, errorThrown) {
        console.log("Failed: "+errorThrown);
      });
}

function getCourses(criteria, callback) {
  var allCourses = [];
  var replyCount = 0;
  for(var i = 0; i < criteria["departments"].length; i++) {
    var dept = criteria["departments"][i];
    var reqUrl = https://apis.scottylabs.org/v1/schedule/S15/departments/' + dept + '/courses?' + appIdStr;
    $.ajax({
      type: 'GET',
      dataType: "text",
      crossDomain: true,
      jsonp: true,
      url: reqUrl,
      success: function (responseData, textStatus, jqXHR) {
        console.log("success");
        var courses = JSON.parse(responseData)["courses"];
        allCourses = allCourses.concat(filterCourses(courses,criteria));
        replyCount++;
        if(replyCount == criteria["departments"].length) {
          if(criteria["prereqs"]) {
            filterPrereqs(allCourses, criteria, callback);
          } else {
            callback(allCourses);
          }
        }
      },
      error: function (responseData, textStatus, errorThrown) {
        console.log("Failed: "+errorThrown);
        replyCount++;
        if(replyCount == criteria["departments"].length) {
          if(criteria["prereqs"]) {
            filterPrereqs(allCourses, criteria, callback);
          } else {
            callback(allCourses);
          }
        }
    }});
}
