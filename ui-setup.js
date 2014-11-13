var appIdStr = 'app_id=c1ebfcb3-4982-4c4a-8f69-8c664abb7230&app_secret_key=rIUMURQA27n-KWqdUJroLb9IVxYHLaPYqkKBC6Qb5ZVTcBpdcWNR_BTA';

$(document).ready(function () {
  getDeptList();
});

function getDeptList() {
  var reqUrl = 'https://apis.scottylabs.org/v1/schedule/S15/departments?limit=100&' + appIdStr;
  $.ajax({
    type: 'GET',
    dataType: "text",
    crossDomain: true,
    jsonp: true,
    url: reqUrl,
    success: function (responseData, textStatus, jqXHR) {
      var depts = JSON.parse(responseData)['departments'];
      depts = depts.sort(function(a, b) {
	return a['name'].localeCompare(b['name']);
      });
      var dropdown = '<select multiple id="departmentSelector">';
      $.each(depts, function() {
	dropdown += '<option value="' + this['id'] + '">' + this['name'] +
	  " (" + this['id'] + ')</option>';
	
      });
      dropdown += '</select>';
      $('#departments').append(dropdown);
    },
    error: function (responseData, textStatus, errorThrown) {
        console.log("Failed: "+errorThrown);
    }});
}

function search() {
  var selectedDepartments = [];
  $("#departmentSelector option:selected").each(function() {
    selectedDepartments.push($(this).val());
  });
  var request = {
    semester:$("#semester").val(),
    departments:selectedDepartments,
    prereqs:null,
    times:null,
    instrFirstName:$("#instrFirstName").val(),
    instrLastName:$("#instrLastName").val(),
    minUnits:$("#minUnits").val(),
    maxUnits:$("#maxUnits").val(),
    location:$("#loc").val(),
    level:$("#level").val()
  };
  $("#results").empty();
  getCourses(request, function(results) {
    $.each(results, function() {
      $("#results").append("<br />"+this["number"]+" "+this["name"]+"<br />");
    });
  });
}

// Returns mock search results for UI purposes until the filter is complete.
function getMockResults(request) {
  return {"courses":[{"department_id":15,"number":"15462","name":"Computer Graphics","units":12,"lectures":[{"days":"MW","instructors":"Pittsburgh, Pennsylvania","location":"GHC 4215","section":"A","time_start":"01:30PM","time_end":"02:50PM","meetings":[{"days":"MW","time_start":"01:30PM","time_end":"02:50PM","location":"GHC 4215"}]}]},{"department_id":15,"number":"15463","name":"Computational Photography","units":12,"lectures":[{"days":"TR","instructors":"Pittsburgh, Pennsylvania","location":"GHC 5222","section":"A","time_start":"12:00PM","time_end":"01:20PM","meetings":[{"days":"TR","time_start":"12:00PM","time_end":"01:20PM","location":"GHC 5222"}]}]},{"department_id":15,"number":"15466","name":"Computer Game Programming","units":12,"lectures":[{"days":"TR","instructors":"Pittsburgh, Pennsylvania","location":"GHC 4211","section":"A","time_start":"03:00PM","time_end":"04:20PM","meetings":[{"days":"TR","time_start":"03:00PM","time_end":"04:20PM","location":"GHC 4211"}]}]}]};
}
