import { Beolvasas } from './../scanner.service';
import { ScannerView } from './../scannerview';
import { FormControl } from '@angular/forms';
import { Component, OnInit, HostListener, Input, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { codeAnimation } from './scanner.animation';

@Component({
  selector: 'admino-inputview',
  templateUrl: './inputview.component.html',
  styleUrls: ['./inputview.component.scss'],
  animations: [codeAnimation]

})
export class InputviewComponent extends ScannerView implements OnInit, OnDestroy {
  @ViewChild('virtualScrollRef', { static: true, read: ElementRef }) virtualScrollRef: ElementRef;
  // control: FormControl = new FormControl('');
  // selectedId = 0;
  currentRead = '';
  currentManualRead = '';
  hiderOpacity = 1;
  showAnim = false;
  showError = false;
  animTimeout;
  currentYear = new Date().getFullYear();
  // @HostListener('document:keydown', ['$event'])
  // onInput(e) {
  //   this.val = e;
  //   console.log(e)

  // }
  // @HostListener('document:keydown', ['$event'])
  // onaInput(e) {
  //   this.val = e;
  //   console.log(e)
  // }
  @Input() testData: string[] = [];
  testDataId = 0;
  // sample = [
  //   '123/4',
  //   '',
  //   '0192395904',
  //   '1',
  //   '82395904',
  //   'asdgarga',
  //   '5345345234534254564536354645365464564356435645363456456',
  //   '1234567890',
  //   '11111111',
  //   '00000000',
  //   '1111111111',
  //   '0000000000',
  //   '2222222222',
  //   '123/04',
  //   '123/4',
  //   '123/34',
  //   '123/14',
  //   '0/1',
  //   '1/0',
  //   '0/0',
  //   '123/21',
  //   '123/22',
  //   '123456789',
  //   '123/56/89',
  //   '99/99',
  //   '1/1',
  //   '///////',
  //   '543/21',
  //   '54O/21',
  //   '/21',
  //   '1234567891/12',
  //   '12/'
  // ];
  scrollEvt() {
    const scrollPos = this.virtualScrollRef.nativeElement.scrollTop + this.virtualScrollRef.nativeElement.offsetHeight;
    const max = this.virtualScrollRef.nativeElement.scrollHeight;
    if (scrollPos > max - 300) {
      this.hiderOpacity = (max - scrollPos) / 300;
    } else {
      this.hiderOpacity = 1;
    }
  }

  ngOnInit() {
    // this.control.setValue(this.scannerService.beolvasasok);
    // for (let i = 0; i < 1000; i++) {
    //   this.scannerService.syncId++;

    //   const val = this.getControlValue();
    //   const reading: Beolvasas = {
    //     bala: 'asdasd', datum: new Date(), id: this.scannerService.syncId, dolgozo: this.scannerService.dolgozo.id,
    //     utca: this.scannerService.selectedUtca.utca,
    //     fakk: this.scannerService.selectedFakk,
    //     manualis: false
    //   };
    //   val.data.push(reading);

    //   // this.scannerService.beolvasasok = val;
    //   this.scannerService.updateBeolvasas(val, reading.id);

    // }
  }



  @HostListener('document:keydown', ['$event'])
  onManualInput(e) {
    if (e.key === 'Backspace') {
      this.currentManualRead = this.currentManualRead.substring(0, this.currentManualRead.length - 1);
    }
    if (e.key === 'Home') {

      // const randomcode = Math.floor(Math.random() * 1000000) + '/' + '20';
      // this.codeDetected(sample, true);

      // this.sample.forEach(sample => {
      //   const randomcode = Math.floor(Math.random() * 1000000) + '/' + '20';
      //   this.codeDetected(sample, true);
      // });


      this.codeDetected(this.testData[this.testDataId], false);
      this.testDataId++;
      if (this.testDataId >= this.testData.length) {
        this.testDataId = 0;
      }

      // this.scannerService.setSyncedTill(this.scannerService.syncedTill + 3);
    }
    if (e.key === 'Enter') {
      if (this.validateInput(this.currentManualRead, this.currentYear)) {
        this.codeDetected(this.currentManualRead, true);
        this.currentManualRead = '';
        this.currentRead = '';
      } else if (this.currentManualRead.length > 0) {
        this.playError();
      }
    }
    if (e.key === 'Escape') {
      this.onPrev();
    }
  }



  @HostListener('document:keypress', ['$event'])
  onInput(e) {
    if ((this.isNumber(e.key) || e.key === '/') && this.currentManualRead.length <= 10) {
      this.currentManualRead += e.key;
    }
    this.currentRead += e.key;
    if (this.currentRead.endsWith('_+')) {
      this.currentRead = '_++';
    }
    if (this.currentRead.startsWith('_++') && this.currentRead.endsWith('+_')) {
      this.codeDetected(this.currentRead.substring(3, this.currentRead.length - 2));
    }
  }


  //  8 vagy 10 számjegy, utolsó 7 számjegye a bálaszám, előtte levő pedig az évszám
  // 000 4444444
  // yyy balaszam
  // y balaszam
  // 0 4444444
  // az évszám (databaseDate + egy év max)

  // kézzel írva 7 számjegy max de lehet + perjel + évszám kétszámjegy 00-21ig idén (databaseDate + egy év max)
  // manuálisan is lehet vonalkódot beírni

  getControlValue() {
    let val = this.scannerService.beolvasasok;
    if (!val) {
      val = {
        version: this.scannerService.version,
        scanner: this.scannerService.scanner,
        data: []
      };
    }
    if (!val.data) {
      val.data = [];
    }
    return val;
  }
  getDateFormat(date) {
    if (this.currentYear !== new Date(date).getFullYear()) {
      return 'yy/MM/dd H:mm:ss';
    } else {
      return 'MM/dd H:mm:ss';
    }
  }
  codeDetected(code, manualis = false) {
    const validated = this.validateInput(code, this.currentYear + 1);
    if (validated) {
      this.scannerService.syncId++;
      const val = this.getControlValue();
      const reading: Beolvasas = {
        bala: validated, datum: new Date(), id: this.scannerService.syncId, dolgozo: this.scannerService.dolgozo.id,
        utca: this.scannerService.selectedUtca.utca,
        fakk: this.scannerService.selectedFakk,
        manualis
      };
      val.data.push(reading);

      // this.scannerService.beolvasasok = val;
      this.scannerService.updateBeolvasas(val, reading.id);

      this.currentRead = '';
      this.currentManualRead = '';
      this.playAnim();
      this.virtualScrollRef.nativeElement.scrollTop = 0;
      this.scrollEvt();
      this.showError = false;

    } else {
      this.playError();
    }
  }

  playAnim() {
    // if (this.animTimeout) {
    //   clearTimeout(this.animTimeout);
    // }
    this.showAnim = false;
    this.cd.detectChanges();
    this.showAnim = true;
    // this.animTimeout = setTimeout((params) => {
    //   this.showAnim = false;
    // }, 1000);
  }
  playError() {
    this.showError = false;
    this.cd.detectChanges();
    this.showError = true;
  }


  validateInput(input: string, maxEv: number): string {

    maxEv = maxEv % 100;

    let balaSorszam: string;
    let balaEv: string;
    const perPos: number = input.indexOf('/');
    if (perPos !== -1) {
      balaSorszam = input.substring(0, perPos);
      balaEv = input.substring(perPos + 1);
      if (balaSorszam.length > 7 || balaEv.length > 3 || balaEv.length === 0) {
        return null;
      }
    } else {
      const length: number = input.length;
      if (length !== 8 && length !== 10) {
        return null;
      }
      balaSorszam = input.substring(length - 7, length);
      balaEv = input.substring(0, length - 7);
    }

    //balaSorszam balaEv csak számjegyet tartalmazhat ezen a ponton
    const balaSorszamIsNum = /^\d+$/.test(balaSorszam);
    const balaEvIsNum = /^\d+$/.test(balaEv);

    if (balaSorszamIsNum && balaEvIsNum) {

      const balaSorszamValue: number = parseInt('10000000' + balaSorszam, 10) % 10000000;
      const balaEvValue = parseInt('1000' + balaEv, 10) % 1000;

      if (balaSorszamValue === 0 || balaEvValue > maxEv) {
        return null;
      }

      return balaSorszamValue + '/' + balaEvValue;
      //String.format('%7d/%02d', balaSorszamValue, balaEvValue);
    } else {
      // console.log(e)
      return null;
    }
  }

  // @HostListener('document:keypress', ['$event'])
  // onaaInput(e) {
  //   this.val = e;
  //   console.log(e)
  // }
  // @HostListener('document:keyup', ['$event'])
  // onaaInsput(e) {
  //   this.val = e;
  //   console.log(e)
  // }
  // codeClicked(i) {
  //   this.selectedId = i;
  // }
  getCodes() {
    const val = this.getControlValue();
    return val.data.slice().reverse();
  }
  trackByFn(index, item) {
    return item.id;
  }
  // removeCode(code) {
  //   const val = this.getControlValue();

  //   const found = val.data.find((c) => {
  //     return c.code === code.code;
  //   });
  //   if (found) {
  //     val.data.splice(val.data.indexOf(found), 1);
  //     this.control.setValue(val);
  //   }
  //   this.showConfirmationId = -1;

  //   this.cd.detectChanges();
  // }
  ngOnDestroy() {
    // if (this.animTimeout) {
    //   clearInterval(this.animTimeout)
    // }
  }

}
