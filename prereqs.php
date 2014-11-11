<?php
/*
 * Place this file and all python files in a public access folder named
 * www in your root andrew folder.  Sending a request of the form
 * GET HTTP/1.1 www.contrib.andrew.cmu.edu/~[your andrewid]/prereqs.php?"json={$
 * will give you a reply with the body being a json packet of the form
 * {"xx-xxx":"prereqs,"xx-xxx":prereqs} where prereqs are of the form
 * returned by prereqs.py
 */

  function getCourseDescription($deptNum, $courseNum) {
    $reqUrl = "http://coursecatalog.web.cmu.edu/ribbit/index.cgi?page=getcourse.rjs&code=".$deptNum."-".$courseNum;
    $page = file_get_contents($reqUrl);
    return $page;
  }

  function getCoursePrereqs($deptNum, $courseNum) {
    $description = getCourseDescription($deptNum,$courseNum);
    if($description === FALSE) {
      return FALSE;
    }

    $start = strpos($description, "<br />Prerequisites: ");
    if($start === FALSE) {
      $start = strpos($description, "<br />Prerequisite: ");
      if($start === FALSE)
        return FALSE;
      else 
        $start += strlen("<br />Prerequisite: ");
    } else {
      $start += strlen("<br />Prerequisites: ");
    }

    $prereqs = substr($description, $start);
    $end = strpos($prereqs, "<br />");
    if($end === FALSE) {
      return FALSE;
    }
    if ($prereqs[$end-1] == ".") {
      $end -= 1;
    }
    
    return substr($prereqs, 0, $end);
  }

  function reqClean($prereqs) {
    $prereqs = trim($prereqs);
    if($prereqs[0] == "(") {
      $parenLevel = 0;
      $i = 0;
      foreach(str_split($prereqs) as $c) {
        if($c === "(")
          $parenLevel+=1;
        if($c === ")") {
          $parenLevel-=1;
          if($parenLevel == 0 && ($i != strlen($prereqs) - 1))
            return $prereqs;
        }
        $i += 1;
      }
      return substr($prereqs, 1, strlen($prereqs) - 2);
    } else {
      return $prereqs;
    }
  }

  function parseSubPrereqs($subPrereqs) {
    $subPrereqs = trim($subPrereqs);
    if(sscanf($subPrereqs,"%d-%d",$tmp1,$tmp2) == 2 &&
       strlen($subPrereqs) == 6) {
      return $subPrereqs;
    }

    // multi level
    $parenLevel = 0; //not inside any parens
    for($i = 0; $i< strlen($subPrereqs); $i++) {
      $c = $subPrereqs[$i];
      if($c == "(")
        $parenLevel += 1;
      if ($c == ")")
        $parenLevel -= 1;

      if (($c == "o" || $c == "a") && $parenLevel == 0) {
          $connector = "and";
          if($c == "o")
            $connector = "or";

          $shift = strlen($connector);
          $left = parseSubPrereqs(reqClean(substr($subPrereqs,0,$i)));
          $right = parseSubPrereqs(reqClean(substr($subPrereqs,$i + $shift, strlen($subPrereqs) - $i - $shift)));
          return "(".$connector.", [".$left.", " .$right."])";
      }
    }
  return FALSE;
  }

  function getParsedPrereqs($deptNum, $courseNum) {
    return parseSubPrereqs(getCoursePrereqs($deptNum, $courseNum));
  }

  function insertDB($coursePrereqsMap) {
    $db = new SQLite3('prereqs.db');
    if(!$db) {
      header("HTTP/1.1 500 Internal Server Error");
      exit;
    }
    foreach ($coursePrereqsMap as $course => $prereqs) {
      $row = "('".$course."', '".$prereqs."')";
      $db->exec("INSERT INTO prereqs (course, prereqs) VALUES ".$row);
    }
    $db->close();
  }

  function addCoursesDB($courses) {
    $coursePrereqMap = array();
    foreach ($courses as $course) {
      $deptAndNum = explode("-",$course);
      $prereqs = getParsedPrereqs($deptAndNum[0], $deptAndNum[1]);
      if($prereqs) {
        $coursePrereqMap[$course] = $prereqs;
      }
    }
    insertDB($coursePrereqMap);

    return $coursePrereqMap;
  }

  //Open a database connection and look for the courses
  function lookup($courses) { 
    $db = new SQLite3('prereqs.db');
    if(!$db) {
      header("HTTP/1.1 500 Internal Server Error");
      exit;
    }

    $results = $db->query("SELECT * FROM prereqs WHERE course IN ('".implode($courses,"','")."')");

    $prereq_map = array();
    while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
      $prereq_map[$row['course']] = $row['prereqs'];
    }
    $db->close();

    return $prereq_map;
  }

  /* Useful for debuggin, allows command line args
  $courseArgs = array();
  $courseArgs["courses"] = array();
  for($i = 1; $i < $argc; $i+=1) {
    array_push($courseArgs["courses"],$argv[$i]);
  }
  $_POST['data'] = json_encode($courseArgs);
  */

  if (isset($_POST['data'])) {
    $decoded = json_decode (stripslashes($_POST['data']), TRUE);
    if (is_null($decoded) or is_null($decoded['courses'])) {
      header("HTTP/1.1 400 Bad Request");
      exit;
    }
    $courses = $decoded['courses'];
    foreach ($courses as $course) {
      if(sscanf($course,"%d-%d") == -1) {
        header("HTTP/1.1 400 Bad Request");
        exit;
      }
    }

    $prereq_map = lookup($courses);
    //Compile a list of courses not found so that we can add them to the 
    //database
    $unmatched_courses = array();
    foreach ($courses as $course) {
      if(!isset($prereq_map[$course])) {
        array_push($unmatched_courses,$course);
      }
    }

    //Update our DB and result using the web crawler
    if(count($unmatched_courses) > 0) {
      $prereq_map = array_merge($prereq_map, addCoursesDB($unmatched_courses));
    }
    echo json_encode($prereq_map);
  }
  else {
    header("HTTP/1.1 400 Bad Request");
    exit;
  }

?>
