let CreateDialog = (e,thisObj,message, height, width, title,YesCallback,OkMessage,CancelMessage) => {
    if(e!=null&&typeof e !='undefined'&&e!='')
        e.preventDefault();
     let dynamicDialog = $('<div id="MyDialog">'+ message + '</div>');
    dynamicDialog.dialog({
        async:false,
        autoOpen: true,
        title: title,
        modal: true,
        height: "auto",
        width:"auto",
        create: ( event, ui ) => {
            // Set maxWidth
            $(this).css("maxWidth", "400px");
        },
        buttons:[{
            text: OkMessage,
            click: function () {
                $(this).dialog("close");
                YesCallback(thisObj);
            }
             },
            {
                text:CancelMessage,
                click: () => {
                $(this).dialog("close");
                return false;
            }
        }]
    });
}

let AlertDialog = (title,message) => {
    let div = $('<div>'+message+'</div>');
    div.dialog({
        title: title,
        resizable: false,
        modal: true,
        buttons: {
            "OK": () => {
                $(this).dialog("close");
            }
        },
        close: () => {
            $(this).dialog("close");
        }
    });
}