$(function(){
    $('.turno:not(.finished)').on('click', function(e) {
        var currentClicked = $(this);
        var turnId = currentClicked.data('id');
        $('.selected').removeClass('selected');
        currentClicked.addClass('selected');
        $('#turnSelected').val(turnId);
        $('#continue').prop("disabled", false);
        $('#continue').css("display", "inline-block");
        
    });
    var car = $(".owl-carousel").owlCarousel(
        {  center: false,
            items:1,
            loop: false,
            rewind: true,
            margin: 10,
            nav:true,
            dots:true,
            checkVisible: false
        }
    );
});
