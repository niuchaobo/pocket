class Div {
    constructor(popup) {
        this.div = null;
        this.offset = 1;
        this.popup = popup;
        this.t_point = null;
        this.t_data = null;
    }

    showIcon(point,oEvent){
        this.inject();
        const elementRect = this.getRangeRect(point);
        const popupRect = this.div.getBoundingClientRect();

        var posX = elementRect.left;
        if (posX + popupRect.width >= window.innerWidth) {
            posX = window.innerWidth - popupRect.width;
        }

        var posY = elementRect.bottom + this.offset;
        if (posY + popupRect.height >= window.innerHeight) {
            posY = elementRect.top - popupRect.height - this.offset;
        }


        posX = (posX < 0) ? 0 : posX;
        posY = (posY < 0) ? 0 : posY;

        this.div.style.left=posX+'px';
        this.div.style.top=posY+'px';
        this.div.style.visibility = 'visible';
        this.div.innerText='译';
        document.body.appendChild(this.div);

    }
    getRangeRect(point) {
        return rangeFromPoint(point).getBoundingClientRect();
    }

    async showPopup(e){
        let i = 1;
        while(!this.t_data){
            await this.mysleep(500);
            i++;
            if(i>=20){
                break;
            }
        }
        if (this.div != null) {
            this.div.style.visibility = 'hidden';
        }
        this.div.style.visibility = 'hidden';
        this.popup.showNextTo(this.t_point, this.t_data);

        this.t_data=null;
    }

    async mysleep(ms) {
        return new Promise(resolve =>
            setTimeout(resolve, ms)
        )
    }

    hide() {
        if (this.div !== null) {
            this.div.style.visibility = 'hidden';
        }
    }

    sleep(delay) {
        var start = (new Date()).getTime();
        while ((new Date()).getTime() - start < delay) {
            continue;
        }
    }


    hasClass(elem, cls) {
        cls = cls || '';
        if (cls.replace(/\s/g, '').length == 0) return false; //当cls没有参数时，返回false
        return new RegExp(' ' + cls + ' ').test(' ' + elem.className + ' ');
    }

    addClass(ele, cls) {
        if (!this.hasClass(ele, cls)) {
            ele.className = ele.className == '' ? cls : ele.className + ' ' + cls;
        }
    }

    removeClass(ele, cls) {
        if (this.hasClass(ele, cls)) {
            var newClass = ' ' + ele.className.replace(/[\t\r\n]/g, '') + ' ';
            while (newClass.indexOf(' ' + cls + ' ') >= 0) {
                newClass = newClass.replace(' ' + cls + ' ', ' ');
            }
            elem.className = newClass.replace(/^\s+|\s+$/g, '');
        }
    }


    inject(){
        if (this.div !== null) {
            return;
        }

        this.div = document.createElement('div');
        this.div.style.left='-100px';
        this.div.style.top='-100px';
        this.div.style.width='20px'; // 指定宽度
        this.div.style.height='20px'; // 指定高度
        this.div.id = 'ncb-div';
        this.div.style.position='fixed';
        this.div.style.visibility='hidden';
        this.div.style.zIndex=9999;
        this.div.addEventListener('mousedown', (e) => e.stopPropagation());
        this.div.addEventListener('click', (e) => this.showPopup(e));
        let root = document.body;
        root.appendChild(this.div);
    }
}
