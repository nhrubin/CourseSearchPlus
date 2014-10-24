from lxml import html
import requests

def getCourseDescription(deptNum, courseNum):
    # Get the course description page for a course with given course number.
    # (Example: deptNum = 15, courseNum = 251)
    reqUrl = 'http://coursecatalog.web.cmu.edu/ribbit/index.cgi?page=getcourse.rjs&code=' + str(deptNum) + '-' + str(courseNum);

    page = requests.get(reqUrl);
    return page.text;
