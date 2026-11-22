require "test_helper"

class SamplesAndSharingApiTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @project = register_project_owner.projects.create!(title: "Loop", data: { version: 1 })
  end

  test "uploads a WAV and serves it through the project responses" do
    post "/api/projects/#{@project.id}/samples", params: { file: wav_upload }, headers: BROWSER_WRITE_HEADERS

    assert_response :created
    sample = response.parsed_body
    assert_equal wav_bytes, @project.samples.blobs.first.download

    get "/api/projects/#{@project.id}"
    assert_response :success
    assert_equal [sample], response.parsed_body["samples"]

    get sample.fetch("url")
    assert_response :redirect
    follow_redirect!
    assert_response :success
    assert_equal wav_bytes, response.body.b
  end

  test "accepts MP3 content independently of the browser content type" do
    mp3 = "\xFF\xFB\x90\x64".b + ("\0" * 413)
    post "/api/projects/#{@project.id}/samples",
      params: { file: upload(mp3, "application/octet-stream", "beat.mp3") }, headers: BROWSER_WRITE_HEADERS

    assert_response :created
    assert_equal "audio/mpeg", @project.samples.blobs.first.content_type
  end

  test "rejects a fake WAV and an oversized file with useful errors" do
    post "/api/projects/#{@project.id}/samples",
      params: { file: upload("fake wave", "audio/wav", "fake.wav") }, headers: BROWSER_WRITE_HEADERS
    assert_response :unprocessable_content
    assert_includes response.parsed_body.dig("errors", "samples"), "must be WAV or MP3"

    post "/api/projects/#{@project.id}/samples",
      params: { file: upload("a" * (5.megabytes + 1), "audio/mpeg", "large.mp3") }, headers: BROWSER_WRITE_HEADERS
    assert_response :unprocessable_content
    assert_includes response.parsed_body.dig("errors", "samples"), "must be 5 MB or smaller"
    assert_not @project.samples.attached?
  end

  test "opens a public project by token without exposing its internal id" do
    get "/api/shared/#{@project.share_token}"

    assert_response :success
    assert_equal %w[data samples title], response.parsed_body.keys.sort
    assert_equal "Loop", response.parsed_body["title"]

    get "/api/shared/unknown"
    assert_response :not_found
  end

  test "copies a shared project with sound that stays available after deleting the source" do
    post "/api/projects/#{@project.id}/samples", params: { file: wav_upload }, headers: BROWSER_WRITE_HEADERS
    sample = response.parsed_body
    document = { version: 1, tracks: [{ instrument: { kind: "sample", sampleId: sample.fetch("id") } }] }
    @project.update!(data: document)
    token = @project.share_token

    post "/api/shared/#{token}/copy", headers: BROWSER_WRITE_HEADERS
    assert_response :created
    copied = response.parsed_body
    assert_not_equal @project.id, copied["id"]
    assert_not_equal token, copied["share_token"]
    assert_equal document.deep_stringify_keys, copied["data"]
    assert_equal [sample], copied["samples"]

    perform_enqueued_jobs do
      delete "/api/projects/#{@project.id}", headers: BROWSER_WRITE_HEADERS
    end
    assert_response :no_content

    get "/api/projects/#{copied["id"]}"
    assert_response :success
    assert_equal [sample], response.parsed_body["samples"]
    assert_equal wav_bytes, Project.find(copied["id"]).samples.blobs.first.download
  end

  private

  def wav_bytes
    "RIFF".b + [38].pack("V") + "WAVEfmt ".b +
      [16, 1, 1, 8_000, 16_000, 2, 16].pack("VvvVVvv") + "data".b + [2, 0].pack("Vv")
  end

  def upload(bytes, content_type, name)
    Rack::Test::UploadedFile.new(StringIO.new(bytes.dup), content_type, true, original_filename: name)
  end

  def wav_upload
    upload(wav_bytes, "audio/wav", "kick.wav")
  end
end
