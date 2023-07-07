sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/library",
    "sap/ui/Device",
], function (BaseController, JSONModel, formatter, mobileLibrary, Device) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend("project3.controller.Detail", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = this.getOwnerComponent().getModel("detailView");
            oViewModel.setData({
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
                PrjItemId: ""
            });

            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

            this.setModel(oViewModel, "detailView");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler when the share by E-Mail button has been clicked
         * @public
         */
        onSendEmailPress: function () {
            var oViewModel = this.getModel("detailView");

            URLHelper.triggerEmail(
                null,
                oViewModel.getProperty("/shareSendEmailSubject"),
                oViewModel.getProperty("/shareSendEmailMessage")
            );
        },


        /**
         * Updates the item count within the line item table's header
         * @param {object} oEvent an event containing the total number of items in the list
         * @private
         */
        onListUpdateFinished: function (oEvent) {
            var sTitle,
                iTotalItems = oEvent.getParameter("total"),
                oViewModel = this.getModel("detailView");

            // only update the counter if the length is final
            if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
                if (iTotalItems) {
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
                } else {
                    //Display 'Line Items' instead of 'Line items (0)'
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
                }
                oViewModel.setProperty("/lineItemListTitle", sTitle);
            }
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this.getModel("detailView").setProperty("/id", sObjectId);
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

            this.getModel().metadataLoaded().then(function () {
                var sObjectPath = this.getModel().createKey("Projects", {
                    ProjectId: sObjectId
                });

                // Bind the view to the object path and expand the "ToSubprojects" association
                this._bindView("/" + sObjectPath);
            }.bind(this));
        },


        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet, it's not busy. Only if the binding requests data, it is set to busy again
            oViewModel.setProperty("/busy", false);

            var oView = this.getView();

            oView.bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });

            oView.byId("lineItemsList").bindAggregation("items", {
                path: sObjectPath + "/ToSubprojects",
                template: oView.byId("columnListItemTemplate")
            });
        },




        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearListListSelection();
                return;
            }

            var oElementBinding = oView.getElementBinding();
            var sPath = oElementBinding && oElementBinding.getPath();
            var oResourceBundle = this.getResourceBundle();
            var oObject = oElementBinding && oElementBinding.getModel().getProperty(sPath);
            var sObjectId = oObject && oObject.ProjectId;
            var sObjectName = oObject && oObject.ProjectName;
            var oViewModel = this.getModel("detailView");




            this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailView"),
                oLineItemTable = this.byId("lineItemsList"),
                iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);
            oViewModel.setProperty("/lineItemTableDelay", 0);

            oLineItemTable.attachEventOnce("updateFinished", function () {
                // Restore original busy indicator delay for line item table
                oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
            });

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /**
         * Set the full screen mode to false and navigate to list page
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            this.getOwnerComponent().oListSelector.clearListListSelection();
            this.getRouter().navTo("list");
        },

        /**
         * Toggle between full and non full screen mode.
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        },
        toTimeLines: function(oEvent) {
            var oList = oEvent.getSource();
            var bSelected = oEvent.getParameter("selected");
          
            // Skip navigation when deselecting an item in multi-selection mode
            if (!(oList.getModel() === "MultiSelect" && !bSelected)) {
              // Get the list item, either from the listItem parameter or from the event's source itself (depends on the device-dependent mode)
              var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
              this.getModel("detailView").setProperty("/currentSelectedSubProject", oListItem.getBindingContext().getObject())
          
              this._showTimelines(oListItem);
            }
          },
          
          _showTimelines: function(oListItem) {
            var oBindingContext = oListItem.getBindingContext();
            if (oBindingContext) {
              var sSubProjectPath = oBindingContext.getPath().substr(1);
              var oDetailView = this.getView().getModel("detailView");
              var sPrjItemId = oDetailView.getProperty("/" + sSubProjectPath + "/PrjItemId");
          
              oDetailView.setProperty("/PrjItemId", sPrjItemId);
              this.getModel("appView").setProperty("/layout", "ThreeColumnsMidExpanded");
              this.getRouter().navTo("timeline", {
                objectId: oDetailView.getProperty("/id"),
                subProjectId: oBindingContext.getObject().PrjItemId
              });
            } else {
              // Handle the case where the binding context is undefined
              console.log("Binding context is undefined.");
            }
          }
    });

});