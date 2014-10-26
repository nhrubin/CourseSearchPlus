from lxml import html
import requests
import string
import re

def getCourseDescription(deptNum, courseNum):
    # Get the course description page for a course with given course number.
    # (Example: deptNum = 15, courseNum = 251)
    reqUrl = 'http://coursecatalog.web.cmu.edu/ribbit/index.cgi?page=getcourse.rjs&code=' + str(deptNum) + '-' + str(courseNum);

    page = requests.get(reqUrl);
    return page.text;
    
def getCoursePrereqs(deptNum, courseNum):
    description = getCourseDescription(deptNum, courseNum)
    start = string.find(description, "Prerequisites: ") + len("Prerequisites: ")
    if start == -1:
        start = string.find(description, "Prerequisite: ") + len("Prerequisite: ")
        if start == -1:
            return -1
    prereqs = description[start:]
    end = string.find(prereqs, "<br />")
    if end == -1:
        raise InputError
    if prereqs[end-1] == ".":
        end -= 1
    prereqs = prereqs[:end]
    return prereqs
    
    
def reqClean(prereqs):
    prereqs = string.strip(prereqs)
    lenPrereqs = len(prereqs)
    if prereqs[0] == "(":
        parenLevel = 0
        for i in xrange(lenPrereqs):
            c = prereqs[i]
            if c == "(":
                parenLevel += 1
            if c == ")":
                parenLevel -= 1
                if (parenLevel == 0) and (i != lenPrereqs - 1):
                    return prereqs
        return prereqs[1:lenPrereqs-1]
    else:
        return prereqs
    
def parsePrereqs(prereqs):
    cn = re.compile("[0-9][0-9]\-[0-9][0-9][0-9]$")
    
    def parseSubPrereqs(subPrereqs):
        # one course
        if cn.match(subPrereqs):
            return subPrereqs
            
        mostInnerClosedParen = string.find(subPrereqs, ")")
        
        # one level
        if mostInnerClosedParen == -1:
            # input must contain only "or" or only "and" connectors
            prereqList = string.split(subPrereqs)
            connector = "or" if ("or" in prereqList) else "and"
            prereqList = filter(lambda x: x != connector, prereqList)
            return (connector, prereqList)
            
        # multi level
        parenLevel = 0 #not inside any parens
        for i in xrange(len(subPrereqs)):
            c = subPrereqs[i]
            if c == "(":
                parenLevel += 1
            if c == ")":
                parenLevel -= 1
            if ((c == "o") or (c == "a")) and parenLevel == 0:
                connector = "or" if (c == "o") else "and"
                shift = len(connector)
                left = parseSubPrereqs(reqClean(subPrereqs[:i]))
                right = parseSubPrereqs(reqClean(subPrereqs[i + shift:]))
                return (connector, [left, right])
                
    return parseSubPrereqs(prereqs)
    
def getParsedPrereqs(deptNum, courseNum):
    return parsePrereqs(getCoursePrereqs(deptNum, courseNum))
    
