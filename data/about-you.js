"use strict";

/////     Chart initialization     /////
nv.dev = false;

let DataService = function($rootScope) {
  this.rootScope = $rootScope;

  // relay messages from the addon to the page
  self.port.on("message", message => {
    this.rootScope.$apply(_ => {
      this.rootScope.$broadcast(message.content.topic, message.content.data);
    });
  });
}

DataService.prototype = {
  send: function _send(message, obj) {
    self.port.emit(message, obj);
  },
}

let aboutYou = angular.module("aboutYou", []);
aboutYou.service("dataService", DataService);

aboutYou.controller("vizCtrl", function($scope, dataService) {
  /** controller helpers **/
  $scope.makeChartData = function(data) {
    /**
     * Prepare data to be fed to D3.
     * Returns the data normalized and sorted in ascending order.
     */
    let valueTotal = 0
    for (let interestName in data) {
      valueTotal += data[interestName];
    }

    let dataPoints = [];
    for (let interestName in data) {
      dataPoints.push({
        label: interestName,
        value: (data[interestName]/valueTotal)*100,
      });
    }
    dataPoints.sort(function(a,b) {
      return b.value - a.value;
    })

    let chartData = {
      key: "interests",
      values: dataPoints,
    }
    return chartData;
  }

  $scope.redrawChart = function(elementSelector, chart, chartData) {

    d3.select(elementSelector)
      .datum([chartData])
    if (chart.update) {
      chart.update();
    }
  }

  $scope._initialize = function () {
    $scope.historyComputeInProgress = false;
    $scope.historyComputeComplete = false;
    $scope.daysLeft = null;
    $scope.daysLeftStart = null;
    dataService.send("chart_data_request");
  }
  $scope._initialize();

  /** UI functionality **/

  $scope.processHistory = function() {
    $scope._initialize();
    dataService.send("history_process");
    $scope.historyComputeInProgress = true;
  }

  $scope.updateGraphs = function() {
    dataService.send("chart_data_request");
  }

  $scope.$on("days_left", function(event, data) {
    $scope.historyComputeInProgress = true;
    if (!$scope.daysLeftStart) {
      $scope.daysLeftStart = data;
    }
    $scope.daysLeft = data;
    $scope.updateProgressBar();

    // The last day isn't sent by dailyInterestsSpout.
    if ($scope.daysLeft == 1) {
      $scope.historyComputeComplete = true;
    }
  });

  $scope.$on("json_update", function(event, data) {
    ChartManager.appendToGraph(data.type, data.data);
  });

  $scope.$on("chart_init", function(event, data) {
    ChartManager.graphAllFromScratch(data);
  });

  $scope.updateProgressBar = function() {
    let elem = document.querySelector("#progressBar");
    elem.style.width = (100 - Math.round($scope.daysLeft/$scope.daysLeftStart*100)) + "%";
  }
});

self.port.on("style", function(file) {
  let link = document.createElement("link");
  link.setAttribute("href", file);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  document.head.appendChild(link);
});