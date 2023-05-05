FROM apache/superset:2.1.0


# This replaces the default tail js with ours to have tracking
COPY tail_js_custom_extra.html /app/superset/templates/tail_js_custom_extra.html
# This is a dirty little hack to increase the row limit of the native filters
# dont do that at home kids
RUN find /app/superset/static/assets/ -type f -exec sed -i -e 's/row_limit:1e3/row_limit:1e5/g' {} \;

# this is for dev only and needs to be removed
# It allows us to keep the container running for inspection
# you might need to use `docker kill <CONTAINER ID>` to stop it 
# ENTRYPOINT ["tail", "-f", "/dev/null"]
