var appIdStr = 'app_id=c1ebfcb3-4982-4c4a-8f69-8c664abb7230&app_secret_key=rIUMURQA27n-KWqdUJroLb9IVxYHLaPYqkKBC6Qb5ZVTcBpdcWNR_BTA';

/*
 *Example input to get courses
 *When the result is complete, callback is called
 *Note the scottylabs   "instructor" field is actually used for location,
 *so we cant get information about who is teaching the course
 *
 * {"semester" : "F14", //Required
 * "departments" : [15,18],
 * "prereqs" : ["15122", "15251", "15213", "18100"], //Optional
 * "location" : "Pittsburgh", //Optional
 * "times" : {"T" : [{"time_start" : "10:00AM", "time_end" : "3:00PM"}], //Optional
 *           "R" : [{"time_start" : "10:00AM", "time_end" : "3:00PM"}]}}; 
 */

function getClassTime(t) {
  var hours = parseInt(t.substring(0,t.indexOf(":")));
  var minutes = parseInt(t.substring(t.indexOf(":") + 1,t.indexOf(":") + 3));
  if(t.indexOf("PM") > -1 && hours < 12) {
    hours += 12;
  }
  return hours*60 + minutes;
}

function isValidTime(lectureTime, validTimes) {
  for(var i = 0; i < validTimes.length; i++) {
    var s1 = getClassTime(validTimes[i]["time_start"]);
    var s2 = getClassTime(lectureTime["time_start"]);
    var e1 = getClassTime(validTimes[i]["time_end"]);
    var e2 = getClassTime(lectureTime["time_end"]);

    if(s1 <= s2 && e1 >= e2) {
      return true;
    }
  }
  return false;
}
      
function isValidDayTime(lectureTime,validTimes) {
  var times;
  for( var i = 0; i < lectureTime.length; i++) {
    var days = lectureTime[i]["days"];
    if(days.indexOf("M") > -1) {
      if(!validTimes["M"] || !isValidTime(lectureTime[i], validTimes["M"])) {
        return false;
      }
    }
    //Note this works because TR always comes after T if they are both sloted
    if(days.indexOf("T") > -1) {
        if(!validTimes["T"] || !isValidTime(lectureTime[i], validTimes["T"])) {
          return false;
        }
    }
    if(days.indexOf("W") > -1) {
      if(!validTimes["W"] || !isValidTime(lectureTime[i], validTimes["W"])) {
        return false;
      }
    }
    if(days.indexOf("R") > -1) {
      if(!validTimes["R"] || !isValidTime(lectureTime[i], validTimes["R"])) {
        return false;
      }
    }
    if(days.indexOf("F") > -1) {
      if(!validTimes["F"] || !isValidTime(lectureTime[i], validTimes["F"])) {
        return false;
      }
    }
    if(days.indexOf("S") > -1) {
      if(!validTimes["S"] || !isValidTime(lectureTime[i], validTimes["S"])) {
        return false;
      }
    }
    if(days.indexOf("U") > -1) {
      if(!validTimes["U"] || !isValidTime(lectureTime[i], validTimes["U"])) {
        return false;
      }
    }
  }
  return true;
}

function filterCourses(courses,criteria) {
  var validCourses = [];
  for(var i = 0; i < courses.length; i++) {
    var course = courses[i];  
    if((!criteria["minUnits"] || course["units"] >= criteria["minUnits"]) &&
       (!criteria["maxUnits"] || course["units"] <= criteria["maxUnits"])) {
      var validLectures = [];
      for(var j = 0; j < course["lectures"].length; j++) {
        var lecture = course["lectures"][j];
        if(!criteria["location"] ||
          lecture["instructors"].indexOf(criteria["location"]) > -1) {
            if(!criteria["times"]) {
              validLectures.push(lecture);
            } else if(isValidDayTime(lecture["meetings"],criteria["times"])) {
              if(lecture["recitations"]) { 
                var validRecitations = [];
                for(var k = 0; k < lecture["recitations"].length; k++) {
                  var recitation = lecture["recitations"][k];
                  if(!criteria["location"] ||
                    recitation["instructors"].indexOf(criteria["location"]) > -1) {
                      if(isValidDayTime(recitation["meetings"],criteria["times"])) {
                        validRecitations.push(recitation);
                      }
                  }
                }
                if(validRecitations.length > 0 || lecture["recitations"].length == 0) {
                  lecture["recitations"] = validRecitations;
                  validLectures.push(lecture);
                }
              } else {
                validLectures.push(lecture);
              }
            }
        }
      }
      if(validLectures.length > 0 || course["lectures"].length == 0) {
        course["lectures"] = validLectures;
        validCourses.push(course);
      }
    }
  }

  return validCourses;
}

function verifyPrereqs(prereqs, courses) {
  if(!prereqs)
    return true;

  if(prereqs.search(/[0-9][0-9]-[0-9][0-9][0-9]/) == 0) {
    var course = prereqs.substring(0,2) + prereqs.substring (3,6);
    if(courses.indexOf(course) > -1) {
      return true;
    } else {
      return false;
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
      return verifyPrereqs(left, courses) || verifyPrereqs(right, courses);
    }
    if(prereqs.substring(1,4) === "and") {
      return verifyPrereqs(left, courses) && verifyPrereqs(right, courses);
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
    url: "prereqs.php",
    data: "data="+JSON.stringify(args),
    success: function (responseData, textStatus, jqXHR) {
        var verifiedCourses = [];
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
        console.log("CALLD");
    }});
}

function getCourses(criteria, callback) {
  var allCourses = [];
  var replyCount = 0;
  for(var i = 0; i < criteria["departments"].length; i++) {
    var dept = criteria["departments"][i];
    var reqUrl = "https://apis.scottylabs.org/v1/schedule/" + criteria["semester"] + "/departments/" + dept + "/courses?limit=100&" + appIdStr;
    console.log(reqUrl);
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
}
