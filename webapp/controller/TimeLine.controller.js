sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";
    return BaseController.extend("project3.controller.TimeLine", {
        onInit: function () {
            this.getRouter().getRoute("timeline").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(new JSONModel(), "timelinesView");
            this.setModel(new JSONModel({ toggleGroups: true, PrjItemId: "", SubprjName: "" }), "group");
        },

        _onObjectMatched: function (oEvent) {
            var sSubProjectId = oEvent.getParameter("arguments").subProjectId;
            var oCurrentSubProject = this.getOwnerComponent().getModel("detailView").getProperty("/currentSelectedSubProject");
            this.getModel("timelinesView").setProperty("/currentSelectedSubProject", oCurrentSubProject);
            sap.ui.core.BusyIndicator.show(0);

            this.getModel().read(`/TimeLines('${sSubProjectId}')`, {
                urlParameters: {
                    "$expand": "ToTimelineLanguageGrps"
                },

                success: (oData) => {
                    let results = oData?.ToTimelineLanguageGrps?.results;
                    let timelineLanguageGrps = this.getModel("group").getProperty("/toggleGroups")
                        ? this._convertToTree(results)
                        : this._groupByIsoAndVolume(results);

                    this.getModel("timelinesView").setProperty("/timelines", timelineLanguageGrps);

                    this.getModel("group").setProperty("/toggleGroups", true);
                    this.getModel("group").setProperty("/PrjItemId", sSubProjectId);

                    sap.ui.core.BusyIndicator.hide();
                },
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                }
            });

            this.getView().bindElement({
                path: "/subProject",
                model: "currentSubProject"
            });
        },

        onCloseDetailPress: function (oEvent) {
            this.getModel("appView").setProperty("/actionButtonsInfo/endColumn/fullScreen", false);
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            let objectId = this.getModel("group").getProperty("/PrjItemId").substring(0, 4);
            this.getRouter().navTo("object", {
                objectId: `Projects('${objectId}')`
            });
        },

        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/endColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/endColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
            } else {
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        },

        onToggleVolumeGroups: function () {
            let oGroup = this.getModel("group");
            let oTimelinesView = this.getModel("timelinesView");
            let timelines = oTimelinesView.getProperty("/timelines");

            let isToggleGroup = oGroup.getProperty("/toggleGroups");

            if (isToggleGroup) {
                let timelinesWithSubgroups = this._addNewGroups(timelines);
                oTimelinesView.setProperty("/timelines", timelinesWithSubgroups);

                oGroup.setProperty("/toggleGroups", false);
            } else {
                this.getModel().read(`/SubProjects('${oGroup.getProperty("/PrjItemId")}')/ToTimeLines`, {
                    urlParameters: {
                        "$expand": "ToTimelineLanguageGrps"
                    },
                    success: (oData) => {
                        let results = oData.results[0].ToTimelineLanguageGrps.results;
                        let timelineLanguageGrps = this._convertToTree(results);
                        oTimelinesView.setProperty("/timelines", timelineLanguageGrps);
                    }
                });

                oGroup.setProperty("/toggleGroups", true);
            }
        },

        onGroupSelectAll: function (oEvent) {
            var oCheckBox = oEvent.getSource();
            var oGroupItem = oCheckBox.getBindingContext("timelinesView").getObject();
        
            // Get the categories of the group
            var aCategories = oGroupItem.categories;
        
            // Determine the selection status based on the "Select All" checkbox
            var bSelected = oCheckBox.getSelected();
        
            // Update the selection status for each category within the group
            aCategories.forEach(function (oCategory) {
                oCategory.selected = bSelected;
            });
        
            // Update the model to reflect the changes
            this.getModel("timelinesView").refresh();
        },  
        
        onGroupSelectAll: function (oEvent) {
            var oCheckBox = oEvent.getSource();
            var oGroupItem = oCheckBox.getBindingContext("timelinesView").getObject();
        
            // Get the categories of the group
            var aCategories = oGroupItem.categories;
        
            // Determine the selection status based on the "Select All" checkbox
            var bSelected = oCheckBox.getSelected();
        
            // Update the selection status for each category within the group
            aCategories.forEach(function (oCategory) {
                oCategory.selected = bSelected;
            });
        
            // Update the model to reflect the changes
            this.getModel("timelinesView").refresh();
        },        

        _convertToTree: function (results) {
            let languages = JSON.parse(JSON.stringify(results));
            let groupsList = [];
            let groupsOfLanguages = [];
        
            languages.forEach(language => {
                language.SlsLangFlag = language.SlsLang.substring(2, 4);
        
                let index = groupsList.indexOf(language.SlsLangIsoGrp);
        
                if (index === -1) {
                    groupsList.push(language.SlsLangIsoGrp);
                    let newGroup = {
                        categories: [language],
                        title: `Timeline Group ${groupsList.length} (${languages.length} languages)`
                    };
                    groupsOfLanguages.push(newGroup);
                } else {
                    groupsOfLanguages[index].categories.push(language);
                }
            });
        
            return groupsOfLanguages;
        },     
           

        _addNewGroups: function (groupsOfLanguages) {
            let groupsOfLanguagesCopy = JSON.parse(JSON.stringify(groupsOfLanguages));

            groupsOfLanguagesCopy.map(group => {
                let groupsList = [];
                let subgroups = [];

                group.categories.map(language => {
                    let index = groupsList.indexOf(language.SlsLangVolumeGrp);

                    if (index === -1) {
                        groupsList.push(language.SlsLangVolumeGrp);
                        let newGroup = { categories: [language], title: `Volume Group ${groupsList.length}` };
                        subgroups.push(newGroup);
                    } else {
                        subgroups[index].categories.push(language);
                    }
                });

                group.categories = subgroups;
            });

            return groupsOfLanguagesCopy;
        },

        toSelectedTimeline: function (oEvent) {
            var oList = oEvent.getSource();
            var bSelected = oEvent.getParameter("selected");

            if (!(oList.getModel() === "MultiSelect" && !bSelected)) {
                this._showLastPage(oEvent.getSource());
            }
        },

        _showLastPage: function (oItem) {
            this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
            this.getRouter().navTo("lastpage", {
                PrjItemId: oItem.getBindingContext("timelinesView").getObject("PrjItemId"),
                SlsLangIsoGrp: oItem.getBindingContext("timelinesView").getObject("SlsLangIsoGrp"),
                SlsLang: oItem.getBindingContext("timelinesView").getObject("SlsLang")
            });
        }
    });
});