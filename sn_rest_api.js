(function process( /*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    var apiKey = request.queryParams['apiKey'];
    var secret = '<APIKEY>';
    if (apiKey == secret) {
        var event = request.body.data;
        var responseBody = {};
        if (event.data.alertContext.operationName == 'Microsoft.ServiceHealth/incident/action') {
            var inc = new GlideRecord('incident');
            var incidentExists = false;
            inc.addQuery('correlation_id', event.data.essentials.originAlertId);
            inc.query();
            if (inc.hasNext()) {
                incidentExists = true;
                inc.next();
            } else {
                inc.initialize();
            }
            var short_description = "Azure Service Health";
            if (event.data.alertContext.properties.incidentType == "Incident") {
                short_description += " - Service Issue - ";
            } else if (event.data.alertContext.properties.incidentType == "Maintenance") {
                short_description += " - Planned Maintenance - ";
            } else if (event.data.alertContext.properties.incidentType == "Informational" || event.data.alertContext.properties.incidentType == "ActionRequired") {
                short_description += " - Health Advisory - ";
            }
            short_description += event.data.alertContext.properties.title;
            inc.short_description = short_description;
            inc.description = event.data.alertContext.properties.communication;
            //inc.work_notes = "Impacted subscriptions: " + event.data.essentials.alertTargetIDs;
            if (incidentExists) {
                if (event.data.alertContext.properties.stage == 'Active') {
                    inc.state = 2;
                } else if (event.data.alertContext.properties.stage == 'Resolved') {
                    inc.state = 6;
                } else if (event.data.alertContext.properties.stage == 'Closed') {
                    inc.state = 7;
                }
                inc.update();
                responseBody.message = "Incident updated.";
            } else {
                inc.correlation_id = event.data.essentials.originAlertId;
                inc.state = 1;
                inc.impact = 2;
                inc.urgency = 2;
                inc.priority = 2;
                inc.assigned_to = '';
                inc.assignment_group.setDisplayValue('Cloud Center of Expertise');
				//inc.caller_id = '';
                //var subscriptionId = event.data.essentials.alertTargetIDs;
                var comments = "Azure portal Link: https://app.azure.com/" + event.data.essentials.alertId;
                //var impactedServices = JSON.parse(event.data.alertContext.properties.impactedServices);
                //var impactedServicesFormatted = "";
                /*for (var i = 0; i < impactedServices.length; i++) {
                    impactedServicesFormatted += impactedServices[i].ServiceName + ": ";
                    for (var j = 0; j < impactedServices[i].ImpactedRegions.length; j++) {
                        if (j != 0) {
                            impactedServicesFormatted += ", ";
                        }
                        impactedServicesFormatted += impactedServices[i].ImpactedRegions[j].RegionName;
                    }

                    impactedServicesFormatted += "\n";

                }
                comments += "\n\nImpacted Services:\n" + impactedServicesFormatted;*/
                inc.comments = comments;
                inc.insert();
                responseBody.message = "Incident created.";
            }
        } else {
            responseBody.message = "Hello from the other side!";
        }
        response.setBody(responseBody);
    } else {
        var unauthorized = new sn_ws_err.ServiceError();
        unauthorized.setStatus(401);
        unauthorized.setMessage('Invalid apiKey');
        response.setError(unauthorized);
    }
})(request, response);
