import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { AdminoScreenElement } from "../admino-screen-element";
import { AdminoTable2DataSource } from "../../../admino-table2/admino-table2/admino-table2.datasource";
import { ScreenElementTable, ScreenElementChange } from "../../admino-screen.interfaces";
import { AdminoTableComponent } from "../../../admino-table/admino-table/admino-table.component";
import { takeUntil, debounceTime, distinctUntilChanged, filter } from "rxjs/operators";
import { isEqual, debounce, cloneDeep } from "lodash";
import { propExists } from "../../../../utils/propExists";
import { timer, Subscription } from "rxjs";
import { AdminoTable2Component } from "../../../admino-table2/admino-table2/admino-table2.component";

@Component({
  selector: "admino-table-wrapper",
  templateUrl: "./table.component.html",
  styleUrls: ["./table.component.scss"],
})
export class TableComponent extends AdminoScreenElement implements OnInit, AfterViewInit {
  dataSource: AdminoTable2DataSource;
  @ViewChild(AdminoTable2Component, { static: true })
  table: AdminoTable2Component;
  oldVal;
  valueChangeSub: Subscription;
  ngOnInit() {
    // debounceTime(1000),

    this.subscribeToValueChange();
    const conf = this.element as ScreenElementTable;
    this.dataSource = new AdminoTable2DataSource(
      {
        listFunction: (keys, cursorpos, shift, count, index, before, after) =>
          this.screenComponent.api.list(conf.viewName, keys, cursorpos, shift, count, index, before, after, this.element.customVars),
      },
      this.directive.sanitizer
    );
  }

  ngAfterViewInit() {
    if (this.element.value) {
      this.dataSource.state = Object.assign(this.dataSource.state, this.element.value);
      this.dataSource.setKeys(this.element.value.keys);
      this.table.dataSource.loadData().then((params) => {
        this.table.gotoPos(this.dataSource.viewpos);
        this.table.setActiveRow(this.dataSource.cursorAbsPos);
      });
    }
  }

  subscribeToValueChange() {
    if (this.valueChangeSub) {
      this.valueChangeSub.unsubscribe();
    }
    const keyChangeAction = this.getAction("keyChange");
    const dt = keyChangeAction && keyChangeAction.debounce ? keyChangeAction.debounce : 50;
    this.valueChangeSub = this.directive.valueChangeEvent
      .pipe(
        takeUntil(this.ngUnsubscribe),
        debounceTime(dt),
        filter((newVal) => {
          return !isEqual(this.oldVal, newVal);
        })
      )
      .subscribe((newVal) => {
        if (this.element.value !== undefined) {
          if (keyChangeAction) {
            this.table.setPrevValues();
            this.handleAction(keyChangeAction);
          }
        }
        this.oldVal = cloneDeep(newVal);
      });
  }
  handleCellChange(e) {
    const cellChangeAction = this.getAction("cellChange");
    if (cellChangeAction) {
      this.handleAction(cellChangeAction);
    }
  }
  handleCellClick(e) {
    const cellClickAction = this.getAction("cellClick");
    if (cellClickAction) {
      this.handleAction(cellClickAction);
    }
  }
  handleCellDoubleClick(e) {
    const cellClickAction = this.getAction("cellDoubleClick");
    if (cellClickAction) {
      this.handleAction(cellClickAction);
    }
  }
  handleHeaderCellClick(e) {
    const headerClickAction = this.getAction("headerCellClick");
    if (headerClickAction) {
      this.handleAction(headerClickAction);
    }
  }
  onChange(changes: { [id: string]: ScreenElementChange }) {
    let reinitNeeded = false;
    if (changes.viewName) {
      this.dataSource.clearRequests();
      this.dataSource.buffer.clearAll();
      this.dataSource.initialBrowseRequestHappend = false;
      this.dataSource.config.listFunction = (keys, cursor, shift, count, index, before, after) =>
        this.screenComponent.api.list(changes.viewName.new, keys, cursor, shift, count, index, before, after);
      reinitNeeded = true;
    }
    if (changes._clearCache) {
      this.dataSource.buffer.clearAll();
      reinitNeeded = true;
    }

    if (changes.columns) {
      reinitNeeded = true;
      this.table.columns = changes.columns.new;
    }
    if (changes.indexes) {
      this.table.indexes = changes.indexes.new;
    }

    if (changes.rowHeight) {
      reinitNeeded = true;
    }
    if (changes.actions) {
      this.subscribeToValueChange();
    }

    if (this.element.value && this.element.value.shift) {
      delete this.element.value.shift;
      delete this.directive.element.value.shift;
    }

    if (propExists(changes.value)) {
      this.dataSource.state = Object.assign(this.dataSource.state, this.element.value);
      this.dataSource.setKeys(this.element.value.keys);
    }
    if (changes.hidden) {
      reinitNeeded = true;
    }

    if (reinitNeeded) {
      // this.table.updateSize();
      // this.table.pageChange();
      this.table.reinit();
      // this.table.scrollEvent();
    }
    if (changes.value || changes._forceRefresh || changes.forceRefresh) {
      const shift =
        propExists(changes.value) && propExists(changes.value.new) && changes.value.new.shift !== undefined ? changes.value.new.shift : 0;
      // console.log("shift", shift)
      // console.log(this.dataSource.state)
      this.table.dataSource.loadData(shift).then((params) => {
        // if (shift !== 0) {
        // }
        this.table.gotoPos(this.dataSource.viewpos);
        this.table.setActiveRow(this.dataSource.cursorAbsPos);
        this.table.scrollEvent();
        this.table.updateRows();
        this.table.refreshVrows();

        // this.table.prevRowStart = -1;
        // this.table.prevRowEnd = -1;

        // if (propExists(changes.value) && propExists(changes.value.new) && isEqual(changes.value.new.keys, changes.value.old.keys) === false) {
        //   console.log("GOTOPOS", changes.value.new.keys, changes.value.old.keys)
        // } else {
        //   this.table.updateSize();
        //   this.table.scrollEvent();
        //   this.table.pageChange();
        // }
      });
    }
  }
  onDestroy() {
    if (this.valueChangeSub) {
      this.valueChangeSub.unsubscribe();
    }
  }
}
