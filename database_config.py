#!/usr/bin/python

import sqlite3
import sys, string

#Run this method via a python terminal to initialize your database
def createDB():
    conn = sqlite3.connect('prereqs.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE prereqs
              (course TEXT NOT NULL,
               prereqs TEXT,
               PRIMARY KEY (course))''')

    conn.commit()
    conn.close()

