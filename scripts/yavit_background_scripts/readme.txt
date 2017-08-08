### Script 1: bkg_metrics_job_script.py ##
This is a background python script which runs all the time unless killed. It does two things:
i) Calculates the minutely, hourly and daily averages for all metrices.
ii) Determines which metrics exist for each job and updates the job collection.

#Running the script:
python bkg_metrics_job_script.py
