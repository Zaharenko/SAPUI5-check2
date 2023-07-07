sap.ui.define([
    "sap/ui/table/TreeTable",
    "sap/ui/table/TreeTableRenderer"
  ], function(TreeTable, TreeTableRenderer) {
    "use strict";
  
    var CustomTreeTable = TreeTable.extend("project3.control.TreeTable", {
      metadata: {
        library: "project3.control"
      }
    });
  
    CustomTreeTable.prototype.renderTableCell = function(
      oRm,
      oTable,
      oCell,
      oRow,
      iRow,
      iCell,
      oColumn
    ) {
      
    };
  
    return CustomTreeTable;
  });
  