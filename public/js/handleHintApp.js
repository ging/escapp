$(function(){

    window.previewHintApp = () => {

        const modal = `<div class="modal fade " tabindex="-1" role="dialog" id="hintAppModal" aria-labelledby="hintApp" aria-hidden="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Request a hint</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper"/>
              </div>
            </div>
          </div>
        </div>`;


        $( "body" ).append(modal);
        $('#hintAppModal').modal('show')
        $('#hintAppModal').on('hidden.bs.modal', function (e) {
            const newwindow = $('.hintAppIframe')[0].contentWindow;
                var score = newwindow.API_1484_11.GetValue("cmi.score.raw");
                var status = newwindow.API_1484_11.GetValue("cmi.success_status");
                if (newwindow.API_1484_11.GetValue("cmi.completion_status") === "completed") {
                    socket.emit("REQUEST_HINT",{score, status});
                }
            $('#hintAppModal').remove();
        })
        
    };
});