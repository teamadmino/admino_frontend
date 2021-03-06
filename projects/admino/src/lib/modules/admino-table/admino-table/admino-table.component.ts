import { cloneDeep } from "lodash";
import { AdminoTableDataSource, VirtualDataSourceInfoColumn, DataSourceState } from "./admino-table.datasource";
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  ChangeDetectorRef,
  Input,
  OnDestroy,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
} from "@angular/core";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";
import { FormatService } from "admino/src/lib/services/format.service";
import { adminoTableAnimation } from "./admino-table.animation";
import { DomSanitizer } from "@angular/platform-browser";
import { isString } from "util";
import { AdminoTooltipService } from "../../admino-tooltip/admino-tooltip.service";

export interface VirtualRow {
  virtualId: number;
  absoluteId: number;
  pos: number;
  data?: any;
  processedData?: any;
  prevdata?: any;
}

@Component({
  selector: "admino-table",
  templateUrl: "./admino-table.component.html",
  styleUrls: ["./admino-table.component.scss"],
  animations: [adminoTableAnimation],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminoTableComponent implements OnInit, AfterViewInit, OnDestroy {
  private ngUnsubscribe: Subject<null> = new Subject();
  @Output() valueChange: EventEmitter<any> = new EventEmitter();
  @Output() cellClick: EventEmitter<any> = new EventEmitter();
  @Output() cellChange: EventEmitter<any> = new EventEmitter();
  @Output() cellDoubleClick: EventEmitter<any> = new EventEmitter();
  @Output() headerCellClick: EventEmitter<any> = new EventEmitter();

  @Input() dataSource: AdminoTableDataSource;
  _columns: any[];
  @Input() public set columns(v: any) {
    this._columns = v;
    this.updateColumns();
  }
  public get columns(): any {
    return this._columns;
  }
  _indexes: any[];
  @Input() public set indexes(v: any) {
    this._indexes = v;
    this.dataSource.indexes = this.indexes;
  }
  public get indexes(): any {
    return this._indexes;
  }
  _autoRefresh = 0;
  @Input() public set autoRefresh(v: any) {
    this._autoRefresh = v;
    this.dataSource.autoRefresh = this.autoRefresh;
    this.dataSource.setAutoRefresh();
  }
  public get autoRefresh(): any {
    return this._autoRefresh;
  }

  @ViewChild("tableRef", { read: ElementRef, static: true }) tableRef;
  @ViewChild("scrollerRef", { read: ElementRef, static: true }) scrollerRef;
  @ViewChild("fakeContentRef", { read: ElementRef, static: true })
  fakeContentRef;
  @ViewChild("scrollerContentRef", { read: ElementRef, static: true })
  scrollerContentRef;
  @ViewChild("bodyRef", { static: true }) bodyRef: ElementRef;
  @ViewChild("headerRef") headerRef: ElementRef;
  @ViewChild("mainRef", { static: true }) mainRef: ElementRef;

  columnWidths = [];
  sortedColumn;

  vrows: VirtualRow[] = [];
  @Input() oddRowStyle: any = {};
  @Input() headerHeight = 50;
  @Input() rowHeight = 50;
  @Input() hideHeader = false;
  @Input() debug = false;
  @Input() selectedRowStyle = {};
  @Input() selectedCellStyle = {};
  @Input() inactiveSelectedRowStyle = {};
  @Input() inactiveSelectedCellStyle = {};

  viewportSize = 0;
  browserMaxSize = 0;

  // largePagination
  largePage = 0;
  calculatedLargePageSize = 30000;
  largePageSize = 0;
  lastLargePage = 0;
  rowCountOnLastLargePage = 0;
  notfittingRowHeight = 0;
  // smallPagination
  smallPage = 0;
  visibleRowCount = 0;

  scrollPos = 0;
  maxScrollPos = 0;
  prevScrollPos = 0;
  scrollPosCoeff = 0;
  scrollPosCoeffNormal = 0;
  scrollBarWidth = 0;
  largePageCoeff = 0;
  //
  totalsize = -1;
  adjustedTotalsize = 0;

  scrollPercent = 1;
  fakeScrollerHeight = 0;
  manualScroll = false;

  rowStart = 0;
  rowEnd = 0;
  prevRowStart = -1;
  prevRowEnd = -1;

  asd = 100;
  timeoutHelper;
  leavespace = 2;
  @Input() keyOverrides: { trigger: string; key: string }[] = [];
  @Input() isFocused = false;

  // @HostListener('window:resize', ['$event'])
  resize(event: MouseEvent) {
    // this.updateSize();
    this.scrollEvent();
    this.reinit();
  }
  @HostListener("document:mouseup", ["$event"])
  mouseUp(event: MouseEvent) {
    this.manualScroll = false;
  }
  @HostListener("keydown", ["$event"]) onKeydownHandler(event: KeyboardEvent) {
    if (
      this.keyOverrides.find((override) => {
        return override.key === "any" || (override.key === event.key && override.trigger === "keydown");
      })
    ) {
      console.log("OVERRIDE");
      return;
    }
    // if (event.key === "ArrowDown") {
    //   // Your row selection code
    //   console.log(event);
    // } else if ()
    let cursorpos = this.dataSource.state.cursorpos;
    console.log("cursorposbefreeee", cursorpos);
    // console.log("____")
    // console.log("isViewOutsideTop", this.isViewOutsideTop());
    // console.log("isViewOutsideBottom", this.isViewOutsideBottom());
    // console.log("isOutsideTop", this.isOutsideTop());
    // console.log("isOutsideBottom", this.isOutsideBottom());
    // console.log("isAtEnd", this.isAtEnd());
    // console.log("isAtStart", this.isAtStart());
    // console.log("____")
    const leavespace = 2;
    switch (event.key) {
      case "ArrowDown":
        console.log("isViewOutsideTop", this.isViewOutsideTop()); // false
        console.log("isViewOutsideBottom", this.isViewOutsideBottom()); // false
        console.log("isAtStart", this.isAtStart()); // false
        console.log("isAtEnd", this.isAtEnd()); // true
        console.log("curosorpos<0", this.dataSource.state.cursorpos < 0); // false
        console.log("curosorpos>count-1", this.dataSource.state.cursorpos > this.dataSource.state.count - 1); // true false
        console.log("curosorpos", this.dataSource.state.cursorpos, "count-1", this.dataSource.state.count - 1);
        if (
          ((this.isViewOutsideTop() || this.isViewOutsideBottom()) && !this.isAtStart() && !this.isAtEnd()) ||
          this.dataSource.state.cursorpos < 0 ||
          this.dataSource.state.cursorpos > this.dataSource.state.count - 1
        ) {
          // középre igazít
          console.log("arrow down center");
          if (this.isOutsideBottom()) {
            console.log("bottom outside");
            cursorpos = this.dataSource.state.count - this.leavespace;
          } else {
            console.log("bottom not outside");
            cursorpos = this.leavespace;
          }

          this.dataSource.state.cursorpos = cursorpos;
          this.dataSource.loadData().then(() => {
            this.gotoPos(this.dataSource.viewpos);
          });
        } else if (!this.isOutsideBottomMinusOne() && this.dataSource.cursorAbsPos < this.dataSource.totalsize - 1) {
          // léptet egyet le csak frontenden
          console.log("arrow down frontend only");
          cursorpos += 1;
          this.dataSource.cursorAbsPos++;
          this.dataSource.state.cursorpos = cursorpos;
          this.setKeys(this.getKeyAtCursor(cursorpos));
        } else {
          // leshiftel
          if (this.isOutsideBottom()) {
            cursorpos -= 1;
            console.log("arrow down shiftel -1");
          } else if (this.isOutsideTop()) {
            cursorpos += 1;
            console.log("arrow down shiftel +1");
          }
          this.dataSource.state.cursorpos = cursorpos;

          this.dataSource.loadData(1).then(() => {
            this.gotoPos(this.dataSource.viewpos);
          });
        }
        event.preventDefault();
        break;
      case "ArrowUp":
        if ((this.isViewOutsideTop() || this.isViewOutsideBottom()) && !this.isAtStart() && !this.isAtEnd()) {
          // cursorpos = Math.floor(this.dataSource.state.count / 2);
          if (this.isOutsideBottom()) {
            cursorpos = this.dataSource.state.count - this.leavespace;
          } else {
            cursorpos = this.leavespace;
          }

          this.dataSource.state.cursorpos = cursorpos;
          this.dataSource.loadData().then(() => {
            this.gotoPos(this.dataSource.viewpos);
          });
        } else if (!this.isOutsideTopMinusOne() && this.dataSource.cursorAbsPos > 0) {
          cursorpos -= 1;
          this.dataSource.cursorAbsPos--;
          this.dataSource.state.cursorpos = cursorpos;
          this.setKeys(this.getKeyAtCursor(cursorpos));
        } else {
          if (this.isOutsideBottom()) {
            cursorpos -= 1;
          } else if (this.isOutsideTop()) {
            cursorpos += 1;
          }
          this.dataSource.state.cursorpos = cursorpos;
          this.dataSource.loadData(-1).then(() => {
            this.gotoPos(this.dataSource.viewpos);
          });
        }
        console.log("setCursorposto", this.dataSource.state.cursorpos);
        event.preventDefault();

        break;
      case "Home":
        this.dataSource.state.keys = { "#position": "first" };
        this.dataSource.state.cursorpos = 0;
        this.dataSource.loadData().then(() => {
          this.gotoPos(this.dataSource.viewpos);

          console.log(this.dataSource.data);
          console.log(this.vrows);
        });
        event.preventDefault();

        break;
      case "End":
        this.dataSource.state.keys = { "#position": "last" };
        // this.dataSource.state.cursorpos = this.dataSource.state.count - 2;
        this.dataSource.loadData().then(() => {
          this.gotoPos(this.dataSource.viewpos);
          console.log("setcursorpos", this.dataSource.state.cursorpos);
        });

        event.preventDefault();

        break;
      case "PageUp":
        this.dataSource.loadData(-(this.dataSource.state.count - 1)).then(() => {
          this.gotoPos(this.dataSource.viewpos);
        });
        event.preventDefault();

        break;
      case "PageDown":
        this.dataSource.loadData(this.dataSource.state.count - 1).then(() => {
          this.gotoPos(this.dataSource.viewpos);
        });
        event.preventDefault();
        break;
      case "Enter":
        this.cellDoubleClick.next();
        event.preventDefault();
        break;
      case "ArrowRight":
        if (this.dataSource.state.selectedColumnIndex < this.dataSource.columns.length - 1) {
          this.dataSource.state.selectedColumnIndex++;
          this.handleCellChange();
        }
        event.preventDefault();
        break;
      case "ArrowLeft":
        if (this.dataSource.state.selectedColumnIndex > 0) {
          this.dataSource.state.selectedColumnIndex--;
          this.handleCellChange();
        }
        event.preventDefault();
        break;

      default:
        break;
    }
  }
  isViewOutsideTop() {
    return this.dataSource.cursorAbsPos < this.rowStart;
  }
  isViewOutsideBottom() {
    return this.dataSource.cursorAbsPos > this.rowEnd;
  }

  isOutsideTop() {
    return this.dataSource.state.cursorpos < this.leavespace;
  }
  isOutsideTopMinusOne() {
    return this.dataSource.state.cursorpos <= this.leavespace;
  }
  isOutsideBottom() {
    return this.dataSource.state.cursorpos > this.dataSource.state.count - this.leavespace;
  }
  isOutsideBottomMinusOne() {
    return this.dataSource.state.cursorpos >= this.dataSource.state.count - this.leavespace;
  }
  isAtStart() {
    return this.dataSource.cursorAbsPos < this.leavespace;
  }
  isAtEnd() {
    return this.dataSource.cursorAbsPos > this.dataSource.state.totalsize - 1 - this.leavespace;
  }
  getKeyAtCursor(cursorpos) {
    if (this.dataSource.data && this.dataSource.data.data[cursorpos]) {
      return this.dataSource.data.data[cursorpos];
    }
  }
  setKeys(data: any) {
    this.dataSource.setKeys(data);
    this.valueChange.next(this.dataSource.state);
  }

  constructor(
    public cd: ChangeDetectorRef,
    public formatService: FormatService,
    private sanitizer: DomSanitizer,
    private tooltip: AdminoTooltipService
  ) {}

  ngOnInit() {
    this.browserMaxSize = this.calcMaxBrowserScrollSize();
    this.scrollBarWidth = 7;
    // this.getScrollbarWidth();
  }
  ngAfterViewInit() {
    this.dataSource.loadDataStart.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
      this.valueChange.next(value);
    });

    this.dataSource
      .connect()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((data) => {
        if (data) {
          if (this.totalsize !== this.dataSource.totalsize) {
            this.totalsize = this.dataSource.totalsize;
            this.updateSize();
            this.pageChange();
            this.cd.detectChanges();
            this.calculateWidths();
          }
          this.updateRows();
          this.refreshVrows();
          this.cd.detectChanges();
        }
        this.valueChange.next(this.dataSource.state);
      });
    this.reinit();

    this.timeoutHelper = setTimeout((params) => {
      this.reinit();
      this.updateDataSource(true);
    });
  }
  reinit() {
    this.updateSize();
    this.updateRows();
    this.pageChange();
    this.cd.detectChanges();
    this.calculateWidths();
    this.prevRowStart = this.rowStart;
    this.prevRowEnd = this.rowEnd;
  }

  setSelectedHeader(columnIndex) {
    this.dataSource.state.selectedHeaderColumnIndex = columnIndex;
    this.headerCellClick.next();
  }
  setSelected(vrow: VirtualRow, columnIndex, rowIndex) {
    if (vrow.data && vrow.data.data && vrow.data.data.processedData) {
      this.setPrevValues();
      this.dataSource.cursorAbsPos = vrow.absoluteId;
      this.setKeys(vrow.data.data.origData);
      this.dataSource.state.cursorpos = vrow.absoluteId - this.rowStart;
      this.dataSource.state.selectedColumnIndex = columnIndex;
      this.cellClick.next();
    }
    this.handleCellChange();
  }
  setPrevValues() {
    this.dataSource.state.prevKeys = this.dataSource.state.keys;
    this.dataSource.state.prevSelectedColumnIndex = this.dataSource.state.selectedColumnIndex;
  }
  handleCellChange() {
    const col = this.dataSource.state.selectedColumnIndex;
    const getpos = this.columnWidths.reduce((prev, curr, i) => (i < col ? prev + curr : prev), 0);
    const getw = this.columnWidths[col];
    const getwpos = getpos + getw;
    const vpw = this.tableRef.nativeElement.clientWidth;
    const sp = this.tableRef.nativeElement.scrollLeft;

    if (getwpos > sp + vpw) {
      this.tableRef.nativeElement.scrollLeft = getpos - (vpw - getw);
    } else if (getpos < sp) {
      this.tableRef.nativeElement.scrollLeft = getpos;
    }

    this.cellChange.next();
  }
  gotoPos(absoluteId = 0) {
    // console.log("goto", absoluteId);
    let lastRowFix = 0;
    if (absoluteId >= this.adjustedTotalsize) {
      absoluteId = this.adjustedTotalsize - 0.0001;
      lastRowFix = this.notfittingRowHeight;
    }

    const targetPage = this.largePageSize > 0 ? Math.floor(absoluteId / this.largePageSize) : 0;
    this.largePage = targetPage;
    this.pageChange();

    const remainder = this.largePageSize > 0 ? absoluteId % this.largePageSize : 0;
    this.scrollPos = this.tableRef.nativeElement.scrollTop = (remainder + this.largePageCoeff) * this.rowHeight + lastRowFix;
    this.updateRows();
    this.refreshVrows();
  }
  scrollbarMouseDown() {
    this.manualScroll = true;
  }
  scrollbarScroll(e) {
    if (this.manualScroll) {
      const target =
        (this.scrollerRef.nativeElement.scrollTop /
          (this.scrollerRef.nativeElement.scrollHeight - this.scrollerRef.nativeElement.clientHeight)) *
        this.adjustedTotalsize;
      this.gotoPos(target);
    }
  }
  scrollEvent() {
    this.scrollPos = this.tableRef.nativeElement.scrollTop;
    // console.log(this.largePage, this.lastLargePage)
    // console.log((this.rowCountOnLastLargePage + 1) * this.rowHeight - 1)
    const scrollmax = (this.rowCountOnLastLargePage + 1) * this.rowHeight + this.notfittingRowHeight - 1;
    if (this.largePage === this.lastLargePage && this.scrollPos >= scrollmax) {
      this.scrollPos = this.tableRef.nativeElement.scrollTop = scrollmax;
    }

    // && this.adjustedTotalsize > (this.lpage + 1) * this.lpageSize
    // console.log(this.scrollPos, this.maxScrollPos)
    if (this.scrollPos >= this.maxScrollPos && this.largePage < this.lastLargePage) {
      this.largePage++;
      this.pageChange();
      console.log("pageChange up");
      this.scrollPos = this.tableRef.nativeElement.scrollTop = this.rowHeight;
    } else if (this.scrollPos <= 0 && this.largePage > 0) {
      this.largePage--;
      this.pageChange();
      console.log("pageChange down");
      this.scrollPos = this.tableRef.nativeElement.scrollTop = this.maxScrollPos - this.rowHeight;
    }

    // this.scrollPosCoeffNormal + this.rowCount + ((this.rowCount) * this.spage)
    //   + this.lpage * (this.lpageSize - 1) + this.lpageCoeff * (this.lpage - 1);
    // console.log(this.scrollPos / this.maxScrollPos);
    // console.log(absPos);
    // this.scrollPercent =this.scrollPos;
    this.updateRows();

    this.scrollPercent = this.rowStart / this.adjustedTotalsize;
    if (!this.manualScroll) {
      this.scrollerRef.nativeElement.scrollTop = (this.maxScrollPos + this.notfittingRowHeight) * this.scrollPercent;
    }

    this.updateDataSource();
    // if (this.scrollPos >= this.rowHeight * this.bufferSize) {
    //   this.tableRef.nativeElement.scrollTop = this.rowHeight;
    //   this.lpage++;
    // }
    this.prevScrollPos = this.scrollPos;

    if (this.headerRef) {
      this.headerRef.nativeElement.style.marginLeft = -this.tableRef.nativeElement.scrollLeft + "px";
    }
  }

  updateDataSource(force = false) {
    const currentLoadedStart = this.dataSource.viewpos;
    const currentLoadedEnd = this.dataSource.viewpos + this.dataSource.state.count;

    if (force || currentLoadedStart !== this.rowStart || currentLoadedEnd !== this.rowEnd) {
      this.refreshVrows();
      const rowCount = Math.ceil(this.viewportSize / this.rowHeight) + 1;
      const count = Math.max(this.visibleRowCount - 2, rowCount - 2);
      this.dataSource.state.count = count;

      // this.dataSource.state.cursorpos = -(this.rowStart - this.dataSource.cursorAbsPos);
      this.dataSource.state.cursorpos = this.dataSource.cursorAbsPos - this.rowStart;
      console.log("updateDatasource", this.dataSource.state.cursorpos);
      console.log("rowStart", this.rowStart, "absPos", this.dataSource.cursorAbsPos);
      this.dataSource.loadData();
      this.cd.detectChanges();
    }
  }
  isEllipsisActive(e) {
    // return true;
    return e.offsetWidth < e.scrollWidth;
  }
  pageChange() {
    this.maxScrollPos = Math.floor(this.largePageSize * this.rowHeight);

    this.fakeScrollerHeight = this.maxScrollPos + (this.visibleRowCount - 1) * this.rowHeight;
    this.fakeContentRef.nativeElement.style.height = this.fakeScrollerHeight + "px";

    if (this.largePage > this.lastLargePage) {
      this.largePage = this.lastLargePage;
      this.scrollPos = this.tableRef.nativeElement.scrollTop = this.rowCountOnLastLargePage * this.rowHeight - 1;
    }
    this.largePageCoeff = this.largePage - 1 >= 0 ? 1 : 0;
  }
  updateSize() {
    // this.calculateWidths();
    // this.cd.detectChanges();
    // this.tableRef.nativeElement.style.paddingRight = this.scrollBarWidth + 'px';
    this.viewportSize = this.tableRef.nativeElement.clientHeight;
    const count = Math.floor(this.viewportSize / this.rowHeight);
    // this.rowHeight = Math.ceil(this.viewportSize / (count * this.rowHeight) * this.rowHeight);

    this.visibleRowCount = Math.ceil(this.viewportSize / this.rowHeight) + 1;
    if (this.totalsize === -1) {
      this.totalsize = this.visibleRowCount;
      // console.log("totatlsiz", this.tableRef.nativeElement.parentElement.parentElement.parentElement.parentElement.parentElement.clientHeight)
    }
    this.visibleRowCount = this.visibleRowCount > this.totalsize ? this.totalsize : this.visibleRowCount;

    this.notfittingRowHeight = Math.ceil(this.viewportSize / this.rowHeight) * this.rowHeight - this.viewportSize;

    this.calculatedLargePageSize = Math.floor((this.browserMaxSize * 0.5) / this.rowHeight);
    this.calculatedLargePageSize = 15000;
    this.adjustedTotalsize = this.totalsize - (this.visibleRowCount - 1);
    this.lastLargePage = Math.floor(this.adjustedTotalsize / this.calculatedLargePageSize);
    this.rowCountOnLastLargePage = this.adjustedTotalsize % this.calculatedLargePageSize;
    this.largePageSize = this.adjustedTotalsize > this.calculatedLargePageSize ? this.calculatedLargePageSize : this.adjustedTotalsize;
    // this.dataSource.buffer.maxBufferSize = this.lpageSize;
    // this.dataSource.buffer.maxBufferSize = 100;
    // this.lastPage = this.lpageSize - 1 > 0 ? Math.floor(this.totalsize / (this.lpageSize - 1)) : 0;
    // this.rowCountOnLastPage = this.lpageSize >= this.adjustedTotalsize ? this.adjustedTotalsize : this.adjustedTotalsize % this.lpageSize;

    // if totalsize changes and table was already scrolled

    // this.vrows = []
    // for (let i = 0; i < this.visibleRowCount; i++) {
    //   this.vrows.push({ virtualId: this.vrows.length, absoluteId: this.vrows.length, pos: 0 });
    // }

    const rowDifference = Math.abs(this.visibleRowCount - this.vrows.length);
    if (this.vrows.length < this.visibleRowCount) {
      for (let i = 0; i < rowDifference; i++) {
        // this.vrows[i] = { virtualId: i, absoluteId: i, pos: 0 };
        this.vrows.push({
          virtualId: this.vrows.length,
          absoluteId: this.vrows.length,
          pos: 0,
        });
      }
    } else if (this.vrows.length > this.visibleRowCount) {
      for (let i = 0; i < rowDifference; i++) {
        this.vrows.pop();
      }
    }
    this.vrows.forEach((vrow) => {
      vrow.pos = 0;
    });

    this.maxScrollPos = Math.floor(this.largePageSize * this.rowHeight);
    // this.fakeContentRef.nativeElement.style.height = this.maxScrollPos + (this.rowCount - 1) * this.rowHeight + 'px';
    this.scrollerContentRef.nativeElement.style.height =
      this.largePageSize * this.rowHeight + (this.visibleRowCount - 1) * this.rowHeight + "px";
    // this.tableRef.nativeElement.clientHeight * 5 + 'px';
    // this.fakeContentRef.nativeElement.style.width = 1 + 'px';
    // this.fakeContentRef.nativeElement.style.background = 'red';

    // this.cd.detectChanges();
    // this.calculateWidths();
  }

  updateRows() {
    this.scrollPosCoeff = Math.floor(this.scrollPos / this.rowHeight);

    // this.scrollPosCoeff = this.scrollPosCoeff >= this.adjustedTotalsize - this.lpage * this.lpageSize ? this.adjustedTotalsize - this.lpage * this.lpageSize - 1 : this.scrollPosCoeff;
    this.smallPage = Math.floor(this.scrollPosCoeff / this.visibleRowCount);
    this.scrollPosCoeffNormal = this.scrollPosCoeff - this.smallPage * this.visibleRowCount;

    this.rowStart = this.scrollPosCoeff + this.largePage * this.largePageSize - this.largePageCoeff;
    this.rowEnd = Math.max(this.rowStart + this.visibleRowCount - 1 - 1, this.rowStart);

    for (const vrow of this.vrows) {
      this.updateRow(vrow);
    }
  }
  updateRow(vrow: VirtualRow) {
    const possibleAbsId =
      vrow.virtualId +
      this.visibleRowCount +
      this.visibleRowCount * this.smallPage +
      this.largePage * (this.largePageSize - 1) +
      this.largePageCoeff * (this.largePage - 1);
    // && possibleAbsId <= this.totalsize - 1
    if (vrow.virtualId < this.scrollPosCoeffNormal) {
      // console.log('jump', vrow.virtualId)

      if (possibleAbsId < this.totalsize) {
        vrow.absoluteId = possibleAbsId;
        // console.log("sethere")
        // console.log(vrow.absoluteId)
        vrow.pos =
          vrow.virtualId * this.rowHeight + this.visibleRowCount * this.rowHeight + this.smallPage * this.rowHeight * this.visibleRowCount;
      }
    } else {
      vrow.absoluteId =
        vrow.virtualId +
        this.smallPage * this.visibleRowCount +
        this.largePage * (this.largePageSize - 1) +
        this.largePageCoeff * (this.largePage - 1);
      if (vrow.absoluteId < this.totalsize) {
        vrow.pos = vrow.virtualId * this.rowHeight + this.smallPage * this.rowHeight * this.visibleRowCount;
      }
    }
  }

  refreshVrows() {
    for (const vrow of this.vrows) {
      const d = this.dataSource.buffer.get(vrow.absoluteId);
      vrow.data = d;
    }
  }

  calculateWidths() {
    // console.log(this.bodyRef.nativeElement.clientWidth, this.dataSource.state.keys);

    if (!(this.bodyRef.nativeElement as HTMLElement).children[0]) {
      console.log("returned");
      return;
    }
    const fullWidth = this.bodyRef.nativeElement.clientWidth;
    this.scrollBarWidth = this.tableRef.nativeElement.offsetWidth - this.tableRef.nativeElement.clientWidth;
    this.scrollerRef.nativeElement.style.width = this.scrollBarWidth + "px";

    // console.log(this.scrollBarWidth);
    // const trArr = (this.bodyRef.nativeElement as HTMLElement).children[0].children;
    // console.log(this.tableRef.nativeElement.offsetWidth - this.tableRef.nativeElement.clientWidth)
    // console.log(fullWidth)
    // const actionsWidth = trArr[trArr.length - 1].clientWidth;
    // const availableWidth = fullWidth - actionsWidth - this.scrollBarWidth;
    const availableWidth = fullWidth;
    let max = 0;
    this.dataSource.columns.forEach((col) => {
      max += col.length;
    });
    for (let i = 0; i < this.dataSource.columns.length; i++) {
      const col = this.dataSource.columns[i];
      this.columnWidths[i] = (availableWidth / max) * col.length;
      if (this.columnWidths[i] < col.length * 10) {
        this.columnWidths[i] = col.length * 10;
      }
    }
  }

  private calcMaxBrowserScrollSize(): number {
    // if (!this.realScrollSize) {
    const div = document.createElement("div");
    const style = div.style;
    style.position = "absolute";
    style.left = "99999999999999px";
    style.top = "9999999999999999px";
    document.body.appendChild(div);

    const size = div.getBoundingClientRect().top;
    document.body.removeChild(div);
    // return Math.abs(size) / 2;
    return size;
    // return 100000;
    // } else {
    //   return this.realScrollSize;
    // }
  }
  // getScrollbarWidth() {

  //   const outer = document.createElement('div');
  //   outer.style.visibility = 'hidden';
  //   outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  //   outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  //   document.body.appendChild(outer);

  //   const inner = document.createElement('div');
  //   outer.appendChild(inner);

  //   const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);

  //   outer.parentNode.removeChild(outer);

  //   return scrollbarWidth;
  // }

  // getScrollbarWidth() {
  //   const inner = document.createElement('p');
  //   inner.style.width = '100%';
  //   inner.style.height = '200px';

  //   const outer = document.createElement('div');
  //   outer.style.position = 'absolute';
  //   outer.style.top = '0px';
  //   outer.style.left = '0px';
  //   outer.style.visibility = 'hidden';
  //   outer.style.width = '200px';
  //   outer.style.height = '150px';
  //   outer.style.overflow = 'hidden';
  //   outer.appendChild(inner);

  //   document.body.appendChild(outer);
  //   let w1 = inner.offsetWidth;
  //   outer.style.overflow = 'scroll';
  //   let w2 = inner.offsetWidth;

  //   if (w1 == w2) {
  //     w2 = outer.clientWidth;
  //   }

  //   document.body.removeChild(outer);

  //   return (w1 - w2);
  // }
  ///////////////////

  updateColumns() {
    this.dataSource.columns = [];
    // this.dataSource.displayedColumns = [];
    this.dataSource.keyIds = [];
    this._columns.forEach((col: VirtualDataSourceInfoColumn) => {
      const column = {
        description: this.sanitizer.bypassSecurityTrustHtml(col.description),
        length: col.length,
        id: col.id,
        style: col.style,
        containerStyle: col.containerStyle,
        headerStyle: col.headerStyle,
        headerContainerStyle: col.headerContainerStyle,
        extraCellDefinitions: col.extraCellDefinitions,
        align: col.align,
        format: col.format,
      };
      this.dataSource.columns.push(column);
      // this.dataSource.displayedColumns.push(column);
      this.dataSource.keyIds.push(col.id);
    });
  }

  format(val, format) {
    return this.formatService.format(val, format);
  }

  getHeaderContainerStyle(column, i) {
    const lastColumnFix = i === this.dataSource.columns.length - 1 ? this.scrollBarWidth : 0;
    const w = this.columnWidths[i] + lastColumnFix;
    return Object.assign(
      {
        width: w + "px",
        "max-width": w + "px",
        "min-width": w + "px",
        "text-align": column.align ? column.align : "left",
      },
      column.headerContainerStyle
    );
  }
  getHeaderStyle(column, i) {
    return column.headerStyle;
  }
  getRowStyle(vrow) {
    // transform1: 'translateY(' + vrow.pos + 'px)',
    const style = {
      height: this.rowHeight + "px",
      transform: "translateY(" + vrow.pos + "px)",
    };

    if (vrow.absoluteId === this.dataSource.cursorAbsPos && this.selectedRowStyle) {
      if (this.isFocused) {
        Object.assign(style, this.selectedRowStyle);
      } else {
        Object.assign(style, this.inactiveSelectedRowStyle);
      }
    }

    return style;
  }
  getContainerStyle(column, data, i, vrow) {
    const containerStyle = Object.assign(
      {
        width: this.columnWidths[i] + "px",
        "max-width": this.columnWidths[i] + "px",
        "min-width": this.columnWidths[i] + "px",
      },
      column.containerStyle
    );

    const extra = data && data.styles && data.styles[column.id] && data.styles[column.id].containerStyle;

    if (extra) {
      Object.assign(containerStyle, extra);
    }

    if (vrow.absoluteId === this.dataSource.cursorAbsPos && i === this.dataSource.state.selectedColumnIndex && this.selectedCellStyle) {
      if (this.isFocused) {
        Object.assign(containerStyle, this.selectedCellStyle);
      } else {
        Object.assign(containerStyle, this.inactiveSelectedCellStyle);
      }
    }
    return containerStyle;
  }
  getStyle(column, data, i) {
    return data && data.styles && data.styles[column.id] && data.styles[column.id].style;
  }
  getBarStyle(column, data, i) {
    return data && data.styles && data.styles[column.id] && data.styles[column.id].barStyle;
  }

  getCellContent(vrow, column) {
    if (vrow.data && vrow.data.data && vrow.data.data.processedData) {
      if (vrow.data.data.processedData["$" + column.id]) {
        return vrow.data.data.processedData["$" + column.id];
      } else {
        return vrow.data.data.processedData[column.id];
      }
    }

    return "";
  }
  //////////////////////////////////////
  mouseEnter(column, vrow, i, cellRef) {
    if (this.isEllipsisActive(cellRef) && vrow) {
      let style = {};
      let content = "";
      if (vrow.data && vrow.data.data) {
        content = this.format(this.getCellContent(vrow, column), column.format);
        style = this.getStyle(column, vrow.data.data, i);
      }
      this.tooltip.set(vrow.absoluteId + "_" + i, content, style);
    }
  }
  mouseLeave(column, vrow, i) {
    if (vrow && vrow.data && vrow.data.data) {
      this.tooltip.remove(vrow.absoluteId + "_" + i);
    }
  }

  ////////////////////////////////
  trackByFn(index, item) {
    return item.absoluteId;
    //  index; // or item.id
  }
  trackByFnCell(index, item) {
    return item.id;
    //  index; // or item.id
  }

  ngOnDestroy() {
    if (this.dataSource) {
      this.dataSource.disconnect();
    }
    if (this.timeoutHelper) {
      clearTimeout(this.timeoutHelper);
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
