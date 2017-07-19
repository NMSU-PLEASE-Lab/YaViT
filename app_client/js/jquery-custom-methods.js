function CreateDialog(e,thisObj,message, height, width, title,YesCallback,OkMessage,CancelMessage) {
    if(e!=null&&typeof e !='undefined'&&e!='')
        e.preventDefault();
     var dynamicDialog = $('<div id="MyDialog">'+ message + '</div>');
    dynamicDialog.dialog({
        async:false,
        autoOpen: true,
        title: title,
        modal: true,
        height: "auto",
        width:"auto",
        create: function( event, ui ) {
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
                click: function() {
                $(this).dialog("close");
                return false;
            }
        }]
    });
}

function AlertDialog(title,message)
{

    var div = $('<div>'+message+'</div>');
    div.dialog({
        title: title,
        resizable: false,
        modal: true,
        buttons: {
            "OK": function () {
                $(this).dialog("close");
            }
        },
        close: function () {
            $(this).dialog("close");
        }
    });
}