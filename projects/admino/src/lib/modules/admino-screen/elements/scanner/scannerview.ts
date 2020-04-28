import { takeUntil } from 'rxjs/operators';
import { ScannerService } from './scanner.service';
import { ChangeDetectorRef, Component, Input, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
@Component({
    template: ''
})
export class ScannerView implements OnDestroy {
    ngUnsubscribe: Subject<any> = new Subject();
    @Input() active: boolean;

    @HostListener('document:keydown', ['$event'])
    onKeyInput(e) {
        console.log("hostlistComp")

        if (e.key === 'Enter') {
            if (this.active) {
                this.onNext();
            }
        }
        if (e.key === 'Escape') {
            if (this.active) {
                this.onPrev();
            }
        }
    }
    constructor(public cd: ChangeDetectorRef, public scannerService: ScannerService) {
        this.scannerService.next.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            if (this.active) {
                this.onNext();
            }
        });
        this.scannerService.prev.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {

            if (this.active) {
                this.onPrev();
            }
        });
    }

    onNext() { }
    onPrev() {
        if (this.scannerService.page.value > 0) {
            this.scannerService.page.next(this.scannerService.page.value - 1);
        }
    }
    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
}
