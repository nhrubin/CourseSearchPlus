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
      console.log("success");
      var depts = JSON.parse(responseData)['departments'];
      depts = depts.sort(function(a, b) {
	return a['name'].localeCompare(b['name']);
      });
      var dropdown = '<select multiple>';
      $.each(depts, function() {
	dropdown += '<option value="' + this['id'] + '">' + this['name'] +
	  " (" + this['id'] + ')</option>';
	
      });
      dropdown += '</select>';
      $('#departments').append(dropdown);
      //console.log(data);
    },
    error: function (responseData, textStatus, errorThrown) {
        console.log("Failed: "+errorThrown);
    }});
}
