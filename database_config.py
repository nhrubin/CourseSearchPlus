#!/usr/bin/python

import sqlite3
import sys, string, re
from prereqs import getParsedPrereqs

//Run this method via a python terminal to initialize your database
def createDB():
    conn = sqlite3.connect('prereqs.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE prereqs
              (course TEXT NOT NULL,
               prereqs TEXT,
               PRIMARY KEY (course))''')

    conn.commit()
    conn.close()

//Insert a set of course=>prereqs into the database
def insertDB(courses_prereqs_map) :
    conn = sqlite3.connect('prereqs.db')
    c = conn.cursor()
    for course, prereqs in courses_prereqs_map.items():
      row = "('" + course + "', '" + re.sub("[']","",str(prereqs)) + "')"
      c.execute('INSERT INTO prereqs (course, prereqs) VALUES ' + row)
    conn.commit()
    conn.close()    

def lookup_courses(courses):
    course_prereq_map = {}
    for course in courses:
      deptAndNum = string.split(course,'-')
      prereqs = getParsedPrereqs(deptAndNum[0],deptAndNum[1])
      if prereqs:
        course_prereq_map[course] = prereqs

    insertDB(course_prereq_map)

if __name__ == '__main__':
  lookup_courses(sys.argv[1:])
