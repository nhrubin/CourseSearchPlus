/*
 * Place this file and all python files in a public access folder named
 * www in your root andrew folder.  Sending a request of the form
 * GET HTTP/1.1 www.contrib.andrew.cmu.edu/~[your andrewid]/prereqs.php?"json={courses:[List of courses]}
 * will give you a reply with the body being a json packet of the form
 * {"xx-xxx":"prereqs,"xx-xxx":prereqs} where prereqs are of the form
 * returned by prereqs.py
 */
 
<?php

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

  if (isset($_REQUEST['json'])) {
    $decoded = json_decode (stripslashes($_REQUEST['json']), TRUE);
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

    //Execute a python script to add unfound courses to the database
    if(count($unmatched_courses) > 0) {
      exec('./database_config.py '.implode($unmatched_courses,' '));
      $prereq_map = lookup($courses);
    }

    echo json_encode($prereq_map);
  }
  else {
    header("HTTP/1.1 400 Bad Request");
    exit;
  }

?>
