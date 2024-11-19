document.addEventListener('DOMContentLoaded', function() {
	const canvas = document.getElementById('your-chart-id');
	if (canvas) {
		const ctx = canvas.getContext('2d');
		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
				datasets: [{
					data: [10,20,30,40,50,60,70,80],
					label: 'Dataset 1',
					backgroundColor: "#4755AB",
					borderWidth: 1,
				}, {
					data: [30,10,70,15,30,20,70,80],
					label: 'Dataset 2',
					backgroundColor: "#E7EDF6",
					borderWidth: 1,
				}]
			},
			options: {
				responsive: true,
				legend: {
					position: 'top',
				},
			}
		});
	}
});
