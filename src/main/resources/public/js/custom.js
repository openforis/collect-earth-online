//homepage - toggle button
$('#togbutton').on('click',function(){
	   $('#lPanel').toggleClass('d-none col-xl-3');
	   $('#mapPanel').toggleClass('col-xl-12 col-xl-9');
	   $('#tog-symb').children().toggleClass('fa-caret-left fa-caret-right')
	   });


