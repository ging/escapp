$(function(){
    window.previewHintApp = () => {
        var newwindow = window.open('/escapeRooms/'+escapeRoomId+'/hintAppWrapper','',
            'width='+screen.width*0.7+',height='+screen.height*0.7);
        newwindow.onbeforeunload = function () {
            var createHint = function(msg){
                let listEl = document.createElement("li");
                listEl.innerHTML= `
                    <div class="card border-info mb-3 animated bounceInUp">
                        <div class="card-body">
                            <div class="card-text">
                                 ${msg}
                            </div>
                        </div>
                    </div>
                `.trim();
                document.getElementById("hintList").appendChild(listEl);
                $("body,html").animate({ scrollTop: Math.max(0,$("#btn-hints").offset().top - 300)}, 100);
            }
            var score = newwindow.API_1484_11.GetValue("cmi.score.raw");
            var status = newwindow.API_1484_11.GetValue("cmi.success_status");
            if (newwindow.API_1484_11.GetValue("cmi.completion_status") === "completed") {
                fetch('/escapeRooms/'+escapeRoomId+'/requestHint', {
                    method: 'POST', 
                    body: JSON.stringify({status, score}), 
                    headers:{
                        'Content-Type': 'application/json'
                    }
                })
                .then(res=>{
                    return res.json();
                })
                .then(res => {
                 

                    if(res.ok) {
                       
                        if (res.alert) {
                            $.easyAlert({message: res.alert || res.msg, 
                                alertType: res.ok ? "info" : "warning", 
                                hidden: function(){
                                     createHint(res.msg);
                                },
                                position: "t 1" });
                        } else {
                             createHint(res.msg);
                        }
                    } else if( res.teacher) {
                        return;
                    } else {
                        $.easyAlert({ 
                            message: res.alert || res.msg, 
                            time: 3000, autoHide: true,
                            alertType: "warning", 
                            position: "t 1" });
                    }

                })
                .catch(e=>{
                    console.error(e);
                });
            }
            newwindow.close();
        }
    };
});