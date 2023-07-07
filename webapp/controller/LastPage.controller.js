sap.ui.define([
    "./BaseController",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
], function (
    BaseController,
    History,
    JSONModel,
    formatter
) {
    "use strict";

    return BaseController.extend("project3.controller.LastPage", {

        formatter: formatter,

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            let oTimeline = {
                startDate: new Date("2017", "0", "15", "8", "0"),
                initTimeline: [{
                    name: "Active timeline 1",
                    activeTimeline: []
                }],
                timeline: [{
                    name: "Active timeline 1",
                    activeTimeline: []
                }]
            };

            let oTimelineForTable = {
                initTimeline: [],
                timeline: [],
                grupsForComparison: [],
                activeLang: [],
                SlsLangIsoGrp: "",
                PrjItemId: "",
                busy: false
            };

            this.setModel(new JSONModel(oTimeline), "timelines");
            this.setModel(new JSONModel(oTimelineForTable), "tableTimelines");
            this.getRouter().getRoute("lastpage").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            this.getModel("tableTimelines").setProperty("/activeLang", []);
            let PrjItemId = oEvent.getParameter("arguments").PrjItemId;
            let SlsLang = oEvent.getParameter("arguments").SlsLang;
            let SlsLangIsoGrp = oEvent.getParameter("arguments").SlsLangIsoGrp;
            let oData = new Promise((resolve, reject) => {
                this.getModel().read("/TimelineVersions", {

                    filters: [
                        new sap.ui.model.Filter("PrjItemId", sap.ui.model.FilterOperator.EQ, PrjItemId),
                        new sap.ui.model.Filter("SlsLang", sap.ui.model.FilterOperator.EQ, SlsLang)
                    ],


                    success: (oData) => {
                        resolve(oData.results);
                        let results = oData.results;
                        if (results.length > 0) {
                            this.getModel("timelines").setProperty("/timeline/0/activeTimeline", results);
                            this.getModel("timelines").setProperty("/initTimeline/0/activeTimeline", results);
                            this.getModel("timelines").setProperty("/startDate", new Date(results[0].StartDate));
                            this.getModel("tableTimelines").setProperty("/timeline", results);
                            this.getModel("tableTimelines").setProperty("/initTimeline", results);
                            this.getModel("tableTimelines").setProperty("/PrjItemId", PrjItemId);
                        }
                    }

                });
            });

            let oGrupsForComparison = new Promise((resolve, reject) => {
                this.getModel().read("/TimelineLanguageGrps", {

                    filters: [
                        new sap.ui.model.Filter("PrjItemId", sap.ui.model.FilterOperator.EQ, PrjItemId),
                        new sap.ui.model.Filter("SlsLangIsoGrp", sap.ui.model.FilterOperator.NE, SlsLangIsoGrp)
                    ],

                    success: (oData) => {
                        resolve(oData.results);
                        this.getModel("tableTimelines").setProperty("/grupsForComparison", oData.results);
                    }
                });
            });

            Promise.all([oData, oGrupsForComparison]);
        },

        updateFinished: function () {
            var oTable = this.getView().byId("timelineTable");
            let aItems = oTable.getItems();
            let timelines = this.getModel("tableTimelines").getProperty("/timeline");
            if (aItems.length > 0) {
                for (let i = 0; i < aItems.length; i++) {
                    $("#" + aItems[i].getId()).css("background-color", timelines[i].StepColor);
                }
            }
        },

        onNavBack: function () {
            let sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("timeline", {}, true);
            }
            this.getModel("appView").setProperty("/layout", "ThreeColumnsMidExpanded");
        },

        changeActiveLang: function () {
            this.setBusy(true);
            let tableTimelines = this.getModel("tableTimelines");
            let selectedLanguages = tableTimelines.getProperty("/activeLang");
            let initTimeline = [...this.getModel("timelines").getProperty("/initTimeline")];
            let initTimelineTable = [...tableTimelines.getProperty("/initTimeline")];

            tableTimelines.setProperty("/timeline", initTimelineTable);
            this.getModel("timelines").setProperty("/timeline", initTimeline);

            let promises = [];
            if (selectedLanguages.length > 0) {
                selectedLanguages.forEach(lang => {
                    let oData = new Promise((resolve, reject) => {
                        this.getModel().read("/TimelineVersions", {

                            filters: [
                                new sap.ui.model.Filter("PrjItemId", sap.ui.model.FilterOperator.EQ, this.getModel("tableTimelines").getProperty("/PrjItemId")),
                                new sap.ui.model.Filter("SlsLang", sap.ui.model.FilterOperator.EQ, lang)
                            ],

                            success: (oData) => {
                                let curentTimelinesTable = [...this.getModel("tableTimelines").getProperty("/timeline")];
                                oData.results.forEach(item => curentTimelinesTable.push(item));
                                this.getModel("tableTimelines").setProperty("/timeline", curentTimelinesTable);

                                let curentTimelines = this.getModel("timelines").getProperty("/timeline");
                                curentTimelines.push({
                                    name: `Active timeline ${curentTimelines.length + 1}`,
                                    activeTimeline: oData.results
                                });

                                this.getModel("timelines").setProperty("/timeline", curentTimelines);
                                resolve(oData);
                                this.setBusy(false);
                            }
                        });
                    });

                    promises.push(oData);
                });
            } else {
                this.setBusy(false);
            }
            Promise.all(promises);
        }
    });
});
